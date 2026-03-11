"""
brain/artifact_fetcher.py — Fetch and normalize all artifacts for a document generation task.

Queries:
  - artifacts (company + role) — always included
  - candidate_artifacts — if candidate_id is provided
  - process_artifacts — if interviewer_id is provided

Returns a normalized list where each artifact has entity metadata attached.
summary and tags are populated by the Artifact Processing Pipeline on upload.
key_topics is derived in-memory from tags (no separate DB column needed).
"""


ARTIFACT_SELECT = (
    'id, name, artifact_type, document_type, processed_content, embedding, summary, tags'
)
CANDIDATE_ARTIFACT_SELECT = (
    'id, name, artifact_type, processed_content, embedding, summary, tags'
)
PROCESS_ARTIFACT_SELECT = (
    'id, name, artifact_type, processed_content, embedding, summary, tags'
)


def _build_metadata_stub(artifact: dict) -> dict:
    """
    Build the metadata dict for an artifact.

    summary and tags are populated by the Artifact Processing Pipeline on upload.
    key_topics is derived from tags in-memory (no separate DB column needed).
    """
    tags = artifact.get('tags') or []
    return {
        'summary': artifact.get('summary'),
        'tags': tags,
        'key_topics': tags,
    }


async def fetch_all_artifacts(
    supabase,
    project_id: str,
    candidate_id: str | None = None,
    interviewer_id: str | None = None,
) -> list[dict]:
    """
    Fetch all artifacts relevant to a document generation task and normalize them.

    Knowledge graph model (Supabase FK traversal):
      projects → artifacts (company + role)
      projects → candidates → candidate_artifacts
      projects → interviewers → process_artifacts

    Artifacts with null processed_content (e.g. image-only uploads) are included
    but their embedding text falls back to name + type (handled in embedder.py).
    No user notification — handled silently.
    """
    result = []

    # 1. Company and role artifacts — always included
    try:
        art_resp = supabase.table('artifacts').select(ARTIFACT_SELECT).eq(
            'project_id', project_id
        ).execute()
        for a in (art_resp.data or []):
            result.append({
                **a,
                'source_table': 'artifacts',
                'entity_type': 'project',
                'entity_id': project_id,
                'metadata': _build_metadata_stub(a),
            })
    except Exception as e:
        print(f"[brain/artifact_fetcher] Failed to fetch artifacts: {e}")

    # 2. Candidate artifacts — only when a specific candidate is targeted
    if candidate_id:
        try:
            ca_resp = supabase.table('candidate_artifacts').select(
                CANDIDATE_ARTIFACT_SELECT
            ).eq('candidate_id', candidate_id).execute()
            for a in (ca_resp.data or []):
                result.append({
                    **a,
                    'source_table': 'candidate_artifacts',
                    'entity_type': 'candidate',
                    'entity_id': candidate_id,
                    'metadata': _build_metadata_stub(a),
                })
        except Exception as e:
            print(f"[brain/artifact_fetcher] Failed to fetch candidate artifacts: {e}")

    # 3. Interviewer/process artifacts — only when a specific interviewer is targeted
    if interviewer_id:
        try:
            pa_resp = supabase.table('process_artifacts').select(
                PROCESS_ARTIFACT_SELECT
            ).eq('interviewer_id', interviewer_id).execute()
            for a in (pa_resp.data or []):
                result.append({
                    **a,
                    'source_table': 'process_artifacts',
                    'entity_type': 'interviewer',
                    'entity_id': interviewer_id,
                    'metadata': _build_metadata_stub(a),
                })
        except Exception as e:
            print(f"[brain/artifact_fetcher] Failed to fetch process artifacts: {e}")

    return result
