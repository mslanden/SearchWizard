"""
Pipeline Runner — Orchestrator

Wires all five stages together and manages async execution:
  Stage A (Preprocessor) → synchronous
  Stages B, C, D         → concurrent via asyncio.gather
  Stage E (Assembler)    → synchronous

Also exposes run_pipeline_and_store() which updates the golden_examples DB record
with the final blueprint and processing status.
"""

import asyncio
import logging
import datetime
import anthropic
from supabase import create_client

from pipeline.preprocessor import build_idm
from pipeline.semantic_analyzer import analyze_semantic
from pipeline.layout_analyzer import analyze_layout
from pipeline.visual_style_analyzer import analyze_visual_style
from pipeline.blueprint_assembler import assemble_blueprint

logger = logging.getLogger(__name__)


async def run_pipeline(
    file_bytes: bytes,
    filename: str,
    document_type: str,
    golden_example_id: str,
    anthropic_api_key: str,
) -> dict:
    """
    Run the full Document DNA pipeline and return the assembled blueprint.

    Stages B, C, D run concurrently. Each failed stage produces a dict with
    an 'error' key so the pipeline always reaches assembly.

    Args:
        file_bytes:         Raw uploaded file bytes.
        filename:           Original filename (used for format detection).
        document_type:      Golden example type slug, e.g. "role_specification".
        golden_example_id:  UUID of the golden_examples DB record.
        anthropic_api_key:  Anthropic API key for LLM calls.

    Returns:
        Assembled blueprint dict.
    """
    client = anthropic.AsyncAnthropic(api_key=anthropic_api_key)

    # Stage A — Preprocessing (synchronous, fast)
    logger.info(f"[{golden_example_id}] Stage A: preprocessing {filename}")
    idm = build_idm(file_bytes, filename)
    source_format = idm.get("source_format", "pdf")
    logger.info(
        f"[{golden_example_id}] IDM built: {idm['page_count']} pages, "
        f"scanned={idm['metadata']['is_scanned']}"
    )

    # Stages B, C, D — concurrent
    logger.info(f"[{golden_example_id}] Stages B/C/D: running concurrently")

    async def _safe_semantic():
        try:
            return await analyze_semantic(idm, client)
        except Exception as e:
            logger.error(f"[{golden_example_id}] Stage B failed: {e}")
            return {"sections": [], "error": str(e)}

    async def _safe_layout():
        try:
            return await analyze_layout(idm, client)
        except Exception as e:
            logger.error(f"[{golden_example_id}] Stage C failed: {e}")
            return {"error": str(e)}

    async def _safe_visual():
        try:
            return await analyze_visual_style(file_bytes, source_format, idm, client)
        except Exception as e:
            logger.error(f"[{golden_example_id}] Stage D failed: {e}")
            return {"typography": {}, "color_palette": {}, "error": str(e)}

    content_spec, layout_spec, visual_spec = await asyncio.gather(
        _safe_semantic(),
        _safe_layout(),
        _safe_visual(),
    )

    logger.info(f"[{golden_example_id}] Stage E: assembling blueprint")

    # Stage E — Assembly (synchronous)
    blueprint = assemble_blueprint(
        golden_example_id=golden_example_id,
        document_type=document_type,
        content_spec=content_spec,
        layout_spec=layout_spec,
        visual_spec=visual_spec,
        idm=idm,
    )

    logger.info(f"[{golden_example_id}] Pipeline complete")
    return blueprint


async def run_pipeline_and_store(
    supabase_url: str,
    supabase_key: str,
    anthropic_api_key: str,
    golden_example_id: str,
    file_bytes: bytes,
    filename: str,
    document_type: str,
) -> None:
    """
    Run the pipeline and persist the result to the golden_examples DB record.

    Called as a FastAPI BackgroundTask — exceptions are logged but not re-raised
    so they don't crash the background worker.

    Updates:
      - status → 'processing' at start
      - status → 'ready' + blueprint on success
      - status → 'error' + processing_error on failure
    """
    supabase = create_client(supabase_url, supabase_key)

    # Mark as processing
    supabase.table("golden_examples").update({
        "status": "processing",
        "processing_started_at": datetime.datetime.utcnow().isoformat(),
    }).eq("id", golden_example_id).execute()

    try:
        blueprint = await run_pipeline(
            file_bytes=file_bytes,
            filename=filename,
            document_type=document_type,
            golden_example_id=golden_example_id,
            anthropic_api_key=anthropic_api_key,
        )

        supabase.table("golden_examples").update({
            "blueprint": blueprint,
            "status": "ready",
            "processing_error": None,
            "processing_completed_at": datetime.datetime.utcnow().isoformat(),
        }).eq("id", golden_example_id).execute()

        logger.info(f"Blueprint stored for golden_example_id={golden_example_id}")

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Pipeline failed for {golden_example_id}: {error_msg}")
        try:
            supabase.table("golden_examples").update({
                "status": "error",
                "processing_error": error_msg[:1000],
                "processing_completed_at": datetime.datetime.utcnow().isoformat(),
            }).eq("id", golden_example_id).execute()
        except Exception as db_err:
            logger.error(f"Failed to update error status: {db_err}")
