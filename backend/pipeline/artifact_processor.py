"""
pipeline/artifact_processor.py — Claude-based artifact enrichment.

For every uploaded artifact, generates:
  - summary TEXT: a semantically dense, recruitment-context-aware summary paragraph
  - tags TEXT[]:  5-15 specific topic/keyword tags

After summary + tags are written to the DB, re-runs embed_and_store() so the embedding
benefits from the enriched text. Falls back to raw-content embedding if Claude fails.

Pattern follows semantic_analyzer.py exactly: AsyncAnthropic, tool use, same response
parsing loop.
"""

import logging
from anthropic import AsyncAnthropic
from brain.embedder import embed_and_store

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-sonnet-4-6"
ARTIFACT_PROCESS_MAX_TOKENS = 1024   # summary + 15 tags fits comfortably
MAX_CONTENT_CHARS = 8000             # slightly larger than the 6000-char embed window

_ENRICH_TOOL = {
    "name": "artifact_enrichment",
    "description": (
        "Analyse the provided recruitment artifact and return a structured enrichment "
        "containing a semantically dense summary and a list of topic tags. "
        "The summary will be used as the primary OpenAI embedding signal for "
        "semantic artifact retrieval during document generation."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "summary": {
                "type": "string",
                "description": (
                    "A single paragraph (4-8 sentences, 80-150 words) that captures: "
                    "(1) what type of document this is, (2) who it is about or relevant to, "
                    "(3) the key facts, qualifications, or claims it contains, "
                    "(4) why it is relevant in a recruitment context. "
                    "Be specific — semantic density matters more than readability. "
                    "Avoid generic openers like 'this document provides information about'."
                ),
            },
            "tags": {
                "type": "array",
                "description": (
                    "5 to 15 specific lowercase hyphenated tags covering: "
                    "industry or sector (e.g. 'fintech', 'private-equity'), "
                    "document subtype (e.g. 'executive-cv', 'competency-framework'), "
                    "key named entities if relevant (e.g. 'series-b', 'ftse-100'), "
                    "seniority signals (e.g. 'c-suite', 'vp-level', 'mid-market'), "
                    "geographic market (e.g. 'uk-market', 'us-market', 'apac'), "
                    "recruitment-relevant attributes (e.g. 'hiring-manager-profile'). "
                    "Use hyphens for multi-word tags. No duplicates."
                ),
                "items": {"type": "string"},
                "minItems": 5,
                "maxItems": 15,
            },
        },
        "required": ["summary", "tags"],
    },
}

_SYSTEM_PROMPT = """You are a specialist recruitment document analyst. Your role is to read raw text \
extracted from recruitment artifacts and produce structured metadata used for semantic retrieval \
during AI document generation.

Always call the 'artifact_enrichment' tool. Never return plain text.

Summary guidelines:
- If a DESCRIPTION / USER NOTES field is provided, treat it as the highest-priority context clue. \
It often reveals the artifact's intended purpose and relationship to the engagement in ways the \
content alone cannot — incorporate it directly into the summary framing.
- State what the artifact IS and what it CONTAINS, not a high-level abstract
- Include specific facts: seniority level, industries, companies, skills, years of experience, metrics
- The summary is an embedding anchor — semantic density matters more than prose quality

Tag guidelines:
- If DESCRIPTION / USER NOTES clarifies a specific role (e.g. hiring manager, key stakeholder), \
include that as a tag (e.g. hiring-manager-profile, key-stakeholder)
- Prefer specific over generic: 'private-equity' beats 'finance'
- Always include document category (e.g. resume, job-spec, company-overview, competency-framework)
- Include geographic market if evident (uk-market, us-market, apac)
- Include seniority signals if evident (c-suite, vp-level, board-level, mid-market, entry-level)
- Use hyphens for multi-word tags. No duplicates."""


async def _call_claude_enrich(
    content: str,
    name: str,
    artifact_type: str,
    document_type: str,
    description: str | None,
    anthropic_api_key: str,
) -> dict | None:
    """
    Tool-use call to Claude Sonnet. Returns {summary, tags} on success, None on failure.

    description is included when present — it often contains crucial context about an
    artifact's purpose that is not evident from its content alone (e.g. a generic
    corporate bio that is actually a hiring manager profile).
    """
    lines = [
        "Analyse the following recruitment artifact and call the 'artifact_enrichment' tool.",
        "",
        f"ARTIFACT NAME: {name}",
        f"ARTIFACT TYPE: {artifact_type}",
        f"DOCUMENT TYPE: {document_type}",
    ]
    if description and description.strip():
        lines += [
            f"DESCRIPTION / USER NOTES: {description.strip()}",
            "",
            "NOTE: The DESCRIPTION / USER NOTES field above contains context provided by the user "
            "when uploading this artifact. It often clarifies the artifact's purpose or relevance "
            "in ways not evident from its content — weight it heavily.",
        ]
    lines += [
        "",
        "CONTENT:",
        content[:MAX_CONTENT_CHARS],
    ]
    user_message = "\n".join(lines)

    try:
        client = AsyncAnthropic(api_key=anthropic_api_key)
        response = await client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=ARTIFACT_PROCESS_MAX_TOKENS,
            system=_SYSTEM_PROMPT,
            tools=[_ENRICH_TOOL],
            tool_choice={"type": "tool", "name": "artifact_enrichment"},
            messages=[{"role": "user", "content": user_message}],
        )

        # Extract tool use result (same pattern as semantic_analyzer.py)
        for block in response.content:
            if block.type == "tool_use" and block.name == "artifact_enrichment":
                return block.input

        logger.warning("artifact_processor: Claude did not return an artifact_enrichment tool call")
        return None

    except Exception as e:
        logger.error(f"artifact_processor: Claude call failed: {e}")
        return None


async def process_artifact(
    supabase,
    artifact_id: str,
    table: str,
    anthropic_api_key: str,
) -> dict:
    """
    Main entry point. Fetches the artifact, calls Claude to generate summary + tags,
    writes them to the DB, then re-runs embed_and_store with the enriched artifact dict
    so the embedding benefits from the richer text.

    Never raises — all exceptions are caught, logged, and result in graceful degradation
    (embedding from raw content only if Claude fails).

    Returns:
        {
            'success': bool,
            'summary_generated': bool,
            'artifact_id': str,
            'table': str,
        }
    """
    try:
        art_resp = supabase.table(table).select('*').eq('id', artifact_id).single().execute()
    except Exception as e:
        logger.error(f"artifact_processor: failed to fetch {table}/{artifact_id}: {e}")
        return {'success': False, 'summary_generated': False, 'artifact_id': artifact_id, 'table': table}

    artifact = art_resp.data
    if not artifact:
        logger.warning(f"artifact_processor: {table}/{artifact_id} not found")
        return {'success': False, 'summary_generated': False, 'artifact_id': artifact_id, 'table': table}

    # If there is no text content (e.g. image-only upload), skip Claude and just embed
    processed_content = artifact.get('processed_content') or ''
    if not processed_content.strip():
        logger.info(f"artifact_processor: {artifact_id} has no processed_content — embedding from name+type only")
        await embed_and_store(supabase, artifact_id, table, artifact)
        return {'success': True, 'summary_generated': False, 'artifact_id': artifact_id, 'table': table}

    # Call Claude to generate summary + tags
    result = await _call_claude_enrich(
        content=processed_content,
        name=artifact.get('name', ''),
        artifact_type=artifact.get('artifact_type', ''),
        document_type=artifact.get('document_type', ''),
        description=artifact.get('description'),
        anthropic_api_key=anthropic_api_key,
    )

    if result is None:
        # Claude failed — fall back to embedding from raw content only
        logger.warning(f"artifact_processor: Claude enrichment failed for {artifact_id}, falling back to raw embedding")
        await embed_and_store(supabase, artifact_id, table, artifact)
        return {'success': True, 'summary_generated': False, 'artifact_id': artifact_id, 'table': table}

    summary = result.get('summary', '')
    tags = result.get('tags', [])

    # Store summary + tags
    try:
        supabase.table(table).update({'summary': summary, 'tags': tags}).eq('id', artifact_id).execute()
    except Exception as e:
        logger.error(f"artifact_processor: failed to store summary/tags for {artifact_id}: {e}")
        # Still attempt embedding from enriched data even if DB write fails
        await embed_and_store(supabase, artifact_id, table, artifact)
        return {'success': True, 'summary_generated': False, 'artifact_id': artifact_id, 'table': table}

    # Re-embed with enriched artifact (build_artifact_embed_text already handles non-null summary/tags)
    enriched = {**artifact, 'summary': summary, 'tags': tags}
    await embed_and_store(supabase, artifact_id, table, enriched)

    logger.info(f"artifact_processor: enriched {table}/{artifact_id} — {len(tags)} tags")
    return {'success': True, 'summary_generated': True, 'artifact_id': artifact_id, 'table': table}
