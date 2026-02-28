"""
brain/embedder.py — OpenAI embedding generation and storage.

Generates 1536-dim embeddings using text-embedding-3-small.
Falls back gracefully when OpenAI key is absent or the call fails.
"""
import os
import numpy as np

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536
MAX_EMBED_CHARS = 32000  # ~8000 tokens, within model limit


async def get_embedding(text: str) -> list | None:
    """
    Generate an embedding for the given text via OpenAI.
    Returns None if the key is missing, the input is empty, or the call fails.
    """
    if not OPENAI_API_KEY or not text.strip():
        return None
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        truncated = text[:MAX_EMBED_CHARS]
        resp = await client.embeddings.create(model=EMBEDDING_MODEL, input=truncated)
        return resp.data[0].embedding
    except Exception as e:
        print(f"[brain/embedder] Embedding generation failed: {e}")
        return None


def cosine_similarity(a: list, b: list) -> float:
    """Cosine similarity between two float vectors."""
    a_arr = np.array(a, dtype=np.float32)
    b_arr = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))


def build_artifact_embed_text(artifact: dict) -> str:
    """
    Combine artifact fields into a single string for embedding.
    Priority order: name → type fields → summary (future stub) → processed_content.
    Falls back to "name type" when processed_content is null (e.g. images).

    NOTE: When the Artifact Processing Pipeline ships, add 'key_topics' field here
    as a high-signal prefix before processed_content.
    """
    parts = []
    if artifact.get('name'):
        parts.append(artifact['name'])
    if artifact.get('artifact_type'):
        parts.append(f"Type: {artifact['artifact_type']}")
    if artifact.get('document_type'):
        parts.append(f"Document type: {artifact['document_type']}")
    # Future stub: summary and tags will be populated by the Artifact Processing Pipeline
    if artifact.get('summary'):
        parts.append(f"Summary: {artifact['summary']}")
    if artifact.get('tags'):
        parts.append(f"Tags: {', '.join(artifact['tags'])}")
    if artifact.get('processed_content'):
        parts.append(artifact['processed_content'][:6000])
    return '\n'.join(parts)


async def embed_and_store(supabase, artifact_id: str, table: str, artifact: dict) -> None:
    """
    Generate an embedding for the artifact and write it back to the DB.
    Silently skips if embedding generation fails (non-critical path).
    """
    text = build_artifact_embed_text(artifact)
    embedding = await get_embedding(text)
    if embedding is not None:
        try:
            supabase.table(table).update({'embedding': embedding}).eq('id', artifact_id).execute()
        except Exception as e:
            print(f"[brain/embedder] Failed to store embedding for {artifact_id}: {e}")
