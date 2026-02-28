"""
brain/brain.py — Project Brain orchestrator.

Coordinates the full context-building pipeline:
  1. Fetch blueprint
  2. Fetch all artifacts
  3. Build entity context
  4. Rank artifacts against blueprint sections
  5. Assemble generation prompt

Also provides the Claude call wrapper used by the v3 generation endpoint.
"""
import asyncio

from brain.artifact_fetcher import fetch_all_artifacts
from brain.knowledge_graph import get_entity_context
from brain.relevance_ranker import rank_artifacts_for_blueprint, format_selected_artifacts_summary
from brain.prompt_builder import build_generation_prompt
from brain.embedder import get_embedding


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
    visual_style_spec = blueprint.get('visual_style_spec', {})
    prompt = build_generation_prompt(
        blueprint=blueprint,
        ranked_artifacts=ranked,
        entity_context=entity_ctx,
        visual_style_spec=visual_style_spec,
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


async def call_claude(anthropic_client, prompt: str, max_tokens: int = 8000) -> str:
    """
    Call Claude Sonnet 4.6 with the assembled prompt and return the HTML content.
    Runs in a thread pool executor since the Anthropic SDK is sync.
    """
    import asyncio

    def _sync_call():
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    loop = asyncio.get_event_loop()
    html_content = await loop.run_in_executor(None, _sync_call)
    return html_content
