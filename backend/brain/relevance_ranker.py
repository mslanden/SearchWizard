"""
brain/relevance_ranker.py — Score artifacts against blueprint sections.

Primary scoring: cosine similarity between artifact embedding and section intent embedding.
Fallback scoring: keyword overlap when either embedding is absent (ensures Brain
works from day one before any embeddings are generated).
"""
import re
import asyncio

from brain.embedder import cosine_similarity


async def rank_artifacts_for_blueprint(
    artifacts: list[dict],
    blueprint: dict,
    get_embedding_fn,
    top_k_per_section: int = 5,
) -> dict:
    """
    Rank artifacts against each section in the blueprint's content_structure_spec.

    Embeds all section intents concurrently (asyncio.gather) for efficiency.

    Returns:
        {
            'by_section': {section_id: [top-k {artifact, score, section_id}]},
            'global': [{artifact, score}] — artifacts ranked by average cross-section score
        }
    """
    sections = blueprint.get('content_structure_spec', {}).get('sections', [])

    if not sections:
        # No blueprint sections — rank by entity type priority as fallback
        return _rank_by_entity_priority(artifacts)

    # Embed all section intents concurrently
    intents = [s.get('intent', s.get('section_id', '')) for s in sections]
    section_embeddings = await asyncio.gather(
        *[get_embedding_fn(intent) for intent in intents]
    )

    by_section: dict[str, list] = {}
    # Track per-artifact scores across all sections for global ranking
    artifact_scores: dict[str, list[float]] = {a['id']: [] for a in artifacts}

    for section, intent, section_emb in zip(sections, intents, section_embeddings):
        section_id = section.get('section_id', 'unknown')
        scored = []
        for artifact in artifacts:
            score = _score_artifact(artifact, section_emb, intent)
            scored.append({'artifact': artifact, 'score': score, 'section_id': section_id})
            artifact_scores[artifact['id']].append(score)

        scored.sort(key=lambda x: x['score'], reverse=True)
        by_section[section_id] = scored[:top_k_per_section]

    global_ranking = _compute_global_ranking(artifacts, artifact_scores)
    return {'by_section': by_section, 'global': global_ranking}


def _score_artifact(artifact: dict, section_embedding: list | None, intent: str) -> float:
    """
    Score an artifact's relevance to a section.
    Uses cosine similarity when both embeddings are available; falls back to keyword overlap.
    """
    artifact_embedding = artifact.get('embedding')
    if artifact_embedding and section_embedding:
        return cosine_similarity(artifact_embedding, section_embedding)
    return _keyword_score(artifact, intent)


def _keyword_score(artifact: dict, intent: str) -> float:
    """
    Simple word-overlap fallback used when embeddings are unavailable.
    Minimum score of 0.1 ensures every artifact has a non-zero chance of inclusion.
    """
    if not intent:
        return 0.1
    intent_words = set(re.findall(r'\w+', intent.lower()))
    content = ' '.join(filter(None, [
        artifact.get('name', ''),
        artifact.get('artifact_type', ''),
        artifact.get('document_type', ''),
        (artifact.get('processed_content') or '')[:2000],
    ]))
    content_words = set(re.findall(r'\w+', content.lower()))
    if not intent_words or not content_words:
        return 0.1
    overlap = len(intent_words & content_words)
    return min(0.9, max(0.1, overlap / len(intent_words)))


def _compute_global_ranking(artifacts: list[dict], artifact_scores: dict) -> list[dict]:
    """Rank artifacts by their average relevance score across all sections."""
    scored = []
    for artifact in artifacts:
        scores = artifact_scores.get(artifact['id'], [])
        avg_score = sum(scores) / len(scores) if scores else 0.0
        scored.append({'artifact': artifact, 'score': avg_score})
    scored.sort(key=lambda x: x['score'], reverse=True)
    return scored


def _rank_by_entity_priority(artifacts: list[dict]) -> dict:
    """
    Fallback when blueprint has no sections: order by entity type.
    Priority: candidate > interviewer > role > company.
    """
    priority = {'candidate': 4, 'interviewer': 3, 'role': 2, 'company': 1}

    def entity_score(a: dict) -> float:
        entity_type = a.get('entity_type', '')
        artifact_type = a.get('artifact_type', '')
        return float(priority.get(entity_type, 0) or priority.get(artifact_type, 0))

    ranked = sorted(
        [{'artifact': a, 'score': entity_score(a)} for a in artifacts],
        key=lambda x: x['score'],
        reverse=True,
    )
    return {'by_section': {}, 'global': ranked}


def format_selected_artifacts_summary(ranked_artifacts: dict) -> list[dict]:
    """
    Return a lightweight, frontend-safe summary of the Brain's artifact selection.
    Used by the PromptPreviewModal to show which artifacts were chosen and why.
    """
    seen_ids: set[str] = set()
    summary = []

    by_section = ranked_artifacts.get('by_section', {})
    for section_id, items in by_section.items():
        for item in items:
            art = item['artifact']
            if art['id'] not in seen_ids:
                seen_ids.add(art['id'])
                summary.append({
                    'id': art['id'],
                    'name': art.get('name', 'Unnamed'),
                    'artifact_type': art.get('artifact_type', ''),
                    'entity_type': art.get('entity_type', ''),
                    'section_id': section_id,
                    'score': round(item['score'], 3),
                })

    # Include any globally ranked artifacts not already captured
    for item in ranked_artifacts.get('global', []):
        art = item['artifact']
        if art['id'] not in seen_ids:
            seen_ids.add(art['id'])
            summary.append({
                'id': art['id'],
                'name': art.get('name', 'Unnamed'),
                'artifact_type': art.get('artifact_type', ''),
                'entity_type': art.get('entity_type', ''),
                'section_id': None,
                'score': round(item['score'], 3),
            })

    return summary
