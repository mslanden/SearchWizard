"""
brain/brain.py — Project Brain orchestrator.

Coordinates the full context-building pipeline:
  1. Fetch blueprint
  2. Fetch all artifacts
  3. Build entity context
  4. Rank artifacts against blueprint sections
  5. Assemble generation prompt

Also provides the Claude call wrapper used by the v3 generation endpoint,
and build_chat_context() / call_claude_chat() for the Andro chat endpoint.
"""
import asyncio

from brain.artifact_fetcher import fetch_all_artifacts
from brain.knowledge_graph import get_entity_context
from brain.relevance_ranker import rank_artifacts_for_blueprint, format_selected_artifacts_summary
from brain.prompt_builder import build_generation_prompt
from brain.embedder import get_embedding, cosine_similarity
from brain.relevance_ranker import _parse_embedding


async def build_brain_context(
    supabase,
    project_id: str,
    template_id: str,
    candidate_id: str | None,
    interviewer_id: str | None,
    user_requirements: str,
) -> dict:
    """
    Run the full Project Brain pipeline and return a context dict.

    Returns:
        {
            'prompt': str,               — assembled generation prompt
            'selected_artifacts': list,  — lightweight summary for frontend display
            'entity_context': dict,      — project/candidate/interviewer profiles
            'by_section': dict,          — section → ranked artifacts (internal)
            'document_type': str,
        }

    Raises HTTPException 400 if the template has no V3 blueprint (blueprint is null).
    """
    from fastapi import HTTPException

    # 1. Fetch template + blueprint
    template_resp = supabase.table('golden_examples').select(
        'id, name, document_type, blueprint, visual_data'
    ).eq('id', template_id).single().execute()

    if not template_resp.data:
        raise HTTPException(status_code=404, detail="Template not found")

    template = template_resp.data
    blueprint = template.get('blueprint')

    if not blueprint:
        raise HTTPException(
            status_code=400,
            detail=(
                "This template was created with the V2 pipeline and has no blueprint. "
                "Please re-upload it using the Golden Examples popup to generate a V3 blueprint."
            ),
        )

    # 2 & 3. Fetch artifacts and entity context concurrently
    artifacts, entity_ctx = await asyncio.gather(
        fetch_all_artifacts(supabase, project_id, candidate_id, interviewer_id),
        get_entity_context(supabase, project_id, candidate_id, interviewer_id),
    )

    # 4. Rank artifacts against blueprint sections
    ranked = await rank_artifacts_for_blueprint(
        artifacts,
        blueprint,
        get_embedding_fn=get_embedding,
    )

    # 5. Assemble prompt
    visual_style_guidance = blueprint.get('visual_style_guidance', '')
    prompt = build_generation_prompt(
        blueprint=blueprint,
        ranked_artifacts=ranked,
        entity_context=entity_ctx,
        visual_style_guidance=visual_style_guidance,
        user_requirements=user_requirements,
    )

    selected_artifacts = format_selected_artifacts_summary(ranked)

    return {
        'prompt': prompt,
        'selected_artifacts': selected_artifacts,
        'entity_context': entity_ctx,
        'by_section': ranked.get('by_section', {}),
        'document_type': template.get('document_type', ''),
    }


async def call_claude(
    anthropic_client,
    prompt: str,
    max_tokens: int = 8000,
    system: str | None = None,
    tools: list | None = None,
) -> str:
    """
    Call Claude Sonnet 4.6 and return the text response.

    When system is provided it is passed as the system parameter (chat use case).
    When tools is provided (e.g. web_search) they are passed to the API.
    Runs in a thread pool executor since the Anthropic SDK is sync.
    """

    def _sync_call():
        kwargs = dict(
            model="claude-sonnet-4-6",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = tools
        response = anthropic_client.messages.create(**kwargs)
        stop_reason = response.stop_reason
        output_tokens = response.usage.output_tokens if response.usage else None
        if stop_reason == 'max_tokens':
            print(
                f"⚠️  [call_claude] Generation hit max_tokens limit "
                f"({output_tokens}/{max_tokens} tokens). Output may be truncated."
            )
        else:
            print(
                f"✅ [call_claude] Generation complete. "
                f"stop_reason={stop_reason}, output_tokens={output_tokens}/{max_tokens}"
            )
        # Extract text from response — handles tool_use blocks gracefully
        for block in response.content:
            if hasattr(block, 'text'):
                return block.text
        return ''

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_call)


# ── Chat context builder ──────────────────────────────────────────────────────

MAX_CHAT_FULL_ARTIFACTS = 5      # artifacts with full content in chat system prompt
MAX_CHAT_CONTENT_CHARS = 40_000  # chars per full artifact in chat context


async def build_chat_context(
    supabase,
    project_id: str,
    user_message: str,
    vault_artifact_ids: list[str] | None = None,
) -> dict:
    """
    Assemble the system prompt for an Andro chat turn.

    Returns:
        {
            'system_prompt': str,          — full system prompt for Claude
            'artifact_summaries': list,    — lightweight list for debugging
        }
    """
    # 1. Fetch Andro persona from app_settings
    persona = ''
    try:
        row = supabase.table('app_settings').select('value').eq('key', 'andro_persona').single().execute()
        persona = (row.data or {}).get('value', '')
    except Exception as e:
        print(f"[build_chat_context] Failed to fetch andro_persona: {e}")

    # 2. Fetch all project artifacts + entity context concurrently
    artifacts, entity_ctx = await asyncio.gather(
        fetch_all_artifacts(supabase, project_id),
        get_entity_context(supabase, project_id),
    )

    # 3. Embed user message and score artifacts
    message_embedding = await get_embedding(user_message)

    def _score(artifact: dict) -> float:
        art_emb = _parse_embedding(artifact.get('embedding'))
        if message_embedding and art_emb:
            return cosine_similarity(message_embedding, art_emb)
        return 0.0

    ranked = sorted(artifacts, key=_score, reverse=True)

    # 4. Fetch full content for user-pinned vault artifacts (by ID)
    pinned_ids = set(vault_artifact_ids or [])
    pinned = [a for a in artifacts if a.get('id') in pinned_ids]
    auto_top = [a for a in ranked if a.get('id') not in pinned_ids][:MAX_CHAT_FULL_ARTIFACTS]
    full_content_artifacts = pinned + auto_top

    # 5. Assemble system prompt
    parts = []

    if persona:
        parts.append(persona)

    # Project metadata
    project = entity_ctx.get('project', {})
    if project:
        parts.append('\n---\n\n## Project Context')
        if project.get('title'):
            parts.append(f"Project: {project['title']}")
        if project.get('client'):
            parts.append(f"Client: {project['client']}")
        if project.get('description'):
            parts.append(f"Description: {project['description']}")

    # All artifact summaries (broad vault awareness)
    if artifacts:
        parts.append('\n---\n\n## Project Vault — All Documents')
        parts.append('The following documents are stored in the project vault:')
        for a in artifacts:
            summary = a.get('summary') or ''
            line = f"- **{a.get('name', 'Untitled')}** ({a.get('artifact_type', 'artifact')})"
            if summary:
                line += f": {summary}"
            parts.append(line)

    # Full content of top-ranked + pinned artifacts
    if full_content_artifacts:
        parts.append('\n---\n\n## Most Relevant Documents — Full Content')
        parts.append(
            'The following documents have been selected as most relevant to the current query. '
            'Use them as your primary factual source.'
        )
        for a in full_content_artifacts:
            content = (a.get('processed_content') or '').strip()
            if not content:
                content = '[No text content available]'
            else:
                content = content[:MAX_CHAT_CONTENT_CHARS]
            label = 'pinned' if a.get('id') in pinned_ids else 'auto-selected'
            parts.append(f"\n**{a.get('name', 'Untitled')}** ({label}):\n{content}")

    system_prompt = '\n'.join(parts)

    return {
        'system_prompt': system_prompt,
        'artifact_summaries': [
            {'id': a.get('id'), 'name': a.get('name'), 'score': _score(a)}
            for a in ranked[:MAX_CHAT_FULL_ARTIFACTS]
        ],
    }
