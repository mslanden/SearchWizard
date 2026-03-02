"""
Stage A.5 — OCR Enricher

For design-heavy PDFs (InDesign exports, outlined/vector headings) where PyMuPDF
extracts very little text, this stage uses Claude Vision to OCR all page images
and augments the Intermediate Document Model with the complete text content.

Triggered only when average extracted chars per page is below a threshold,
so text-native PDFs pass through untouched.
"""

import base64
import json


CLAUDE_MODEL = "claude-sonnet-4-6"

# Trigger threshold: if the IDM has fewer than this many chars per page on average,
# OCR enrichment is triggered. The EgonZehnder PDF yields ~165 chars/page (triggered);
# a text-native PDF typically yields 1500–3000 chars/page (not triggered).
_OCR_CHARS_PER_PAGE_THRESHOLD = 500

# Higher resolution for OCR — we want Claude to read body text accurately
_OCR_RENDER_SCALE = 1.5  # 108 DPI

_OCR_MAX_TOKENS = 6000   # sufficient for ~3000 words across 9 pages + JSON overhead

_OCR_SYSTEM_PROMPT = (
    "You are a precise document text extractor. Your only task is to extract all "
    "visible text from PDF page images in reading order and return it as a JSON object. "
    "Return ONLY the JSON — no markdown fences, no explanation."
)

_OCR_USER_TEMPLATE = (
    "Extract all visible text from each of the {n_pages} PDF page images provided below.\n\n"
    "Include ALL text: headings, subheadings, body paragraphs, table content (cell by cell), "
    "bullet lists, captions, footnotes, header and footer text, and any other visible text. "
    "Preserve reading order: top to bottom, left to right within each page.\n\n"
    "Return a JSON object with this exact structure:\n"
    '{{"pages": [{{"page": 1, "text": "all text from page 1 in reading order"}}, '
    '{{"page": 2, "text": "all text from page 2 in reading order"}}, ...]}}\n\n'
    "Return ONLY the JSON object."
)


def _count_idm_chars(idm: dict) -> int:
    """Count total extractable characters across all IDM pages."""
    return sum(
        len(block.get("text", ""))
        for page in idm.get("pages", [])
        for block in page.get("blocks", [])
    )


def _render_all_pages_for_ocr(file_bytes: bytes) -> list:
    """
    Render all PDF pages to base64-encoded PNGs at 108 DPI.
    Higher resolution than the semantic analyzer's heading pass — needed for body text.
    """
    import fitz
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    images = []
    mat = fitz.Matrix(_OCR_RENDER_SCALE, _OCR_RENDER_SCALE)
    for page in doc:
        pix = page.get_pixmap(matrix=mat)
        images.append(base64.b64encode(pix.tobytes("png")).decode("utf-8"))
    doc.close()
    return images


async def enrich_idm_with_vision_ocr(idm: dict, file_bytes: bytes, client) -> dict:
    """
    Stage A.5 entry point.

    Checks text density of the IDM. If sparse (design-heavy PDF), renders all pages
    and uses Claude Vision to extract the complete text, then appends OCR blocks to
    each IDM page so all downstream stages (B, C, D) see the full content.

    Args:
        idm:        Intermediate Document Model from Stage A.
        file_bytes: Raw PDF bytes.
        client:     anthropic.AsyncAnthropic instance.

    Returns:
        IDM dict, either untouched (text was adequate) or augmented with OCR blocks.
    """
    page_count = max(idm.get("page_count", 1), 1)
    total_chars = _count_idm_chars(idm)
    chars_per_page = total_chars / page_count

    if chars_per_page >= _OCR_CHARS_PER_PAGE_THRESHOLD:
        print(
            f"PDF text enricher: {total_chars} chars, {chars_per_page:.0f}/page "
            f"— text density adequate, skipping OCR"
        )
        return idm

    print(
        f"PDF text enricher: {total_chars} chars, {chars_per_page:.0f}/page "
        f"— sparse text detected, running Vision OCR on {page_count} pages"
    )

    try:
        page_images = _render_all_pages_for_ocr(file_bytes)
        print(f"PDF text enricher: rendered {len(page_images)} pages at 108 DPI")

        n_pages = len(page_images)
        content = [{"type": "text", "text": _OCR_USER_TEMPLATE.format(n_pages=n_pages)}]
        for img_b64 in page_images:
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": img_b64,
                },
            })

        response = await client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=_OCR_MAX_TOKENS,
            system=_OCR_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content}],
        )

        # Parse JSON response — strip markdown fences if present
        raw = response.content[0].text if response.content else "{}"
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        ocr_result = json.loads(raw)
        ocr_pages = {entry["page"]: entry["text"] for entry in ocr_result.get("pages", [])}

        # Append one OCR block per page with the complete extracted text.
        # We append rather than replace so existing PyMuPDF style metadata is preserved
        # for the visual/layout analyzers; the OCR block gives the semantic analyzer
        # the full text content it was missing.
        total_ocr_chars = 0
        for page in idm.get("pages", []):
            page_num = page.get("page_number", 0)
            ocr_text = ocr_pages.get(page_num, "").strip()
            if ocr_text:
                page.setdefault("blocks", []).append({
                    "block_id": f"p{page_num}_ocr",
                    "block_type": "text",
                    "bbox": None,
                    "text": ocr_text,
                    "lines": [{"text": ocr_text, "bbox": None}],
                    "style": None,
                    "ocr_confidence": None,
                })
                total_ocr_chars += len(ocr_text)

        idm.setdefault("metadata", {})["ocr_enriched"] = True
        print(
            f"PDF text enricher: complete — added {total_ocr_chars} chars "
            f"across {len(ocr_pages)} pages (was {total_chars})"
        )
        return idm

    except Exception as e:
        print(f"PDF text enricher: Vision OCR failed ({e}), continuing with original IDM")
        return idm
