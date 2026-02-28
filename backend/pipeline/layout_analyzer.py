"""
Stage C — Layout Analyzer

Extracts structural layout rules from the Intermediate Document Model:
margins, column structure, header/footer detection, and spacing patterns.

For PDFs (with bounding boxes): fully algorithmic.
For DOCX (no bboxes): falls back to a Claude call that infers layout from section structure.
"""

import json
import logging
from collections import Counter, defaultdict
from typing import Optional

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 2000

# Header/footer detection: blocks appearing on this fraction of pages at a consistent y-position
_HEADER_FOOTER_PAGE_FRACTION = 0.75
_HEADER_FOOTER_Y_TOLERANCE_PT = 8.0

# Column detection: two x0 clusters more than this distance apart, each with this fraction of blocks
_COLUMN_MIN_SEPARATION_PT = 150.0
_COLUMN_MIN_FRACTION = 0.15

# Bin width for x0 clustering
_BIN_WIDTH_PT = 20.0


def _bucket(value: float, width: float) -> int:
    return int(value / width)


def _detect_column_structure(pages: list) -> str:
    """Return 'single' or 'two-column' based on x0 distribution of text blocks."""
    x0_buckets: Counter = Counter()
    total_blocks = 0

    for page in pages:
        for block in page.get("blocks", []):
            bbox = block.get("bbox")
            if bbox and block.get("block_type") == "text":
                x0_buckets[_bucket(bbox["x0"], _BIN_WIDTH_PT)] += 1
                total_blocks += 1

    if total_blocks == 0:
        return "single"

    # Find the two most common x0 buckets
    top2 = x0_buckets.most_common(2)
    if len(top2) < 2:
        return "single"

    bucket_a, count_a = top2[0]
    bucket_b, count_b = top2[1]

    separation_pt = abs(bucket_a - bucket_b) * _BIN_WIDTH_PT
    frac_a = count_a / total_blocks
    frac_b = count_b / total_blocks

    if (separation_pt >= _COLUMN_MIN_SEPARATION_PT
            and frac_a >= _COLUMN_MIN_FRACTION
            and frac_b >= _COLUMN_MIN_FRACTION):
        return "two-column"
    return "single"


def _detect_margins(pages: list, width_pt: Optional[float], height_pt: Optional[float]) -> dict:
    """Estimate margins by averaging the extremal positions of text blocks across pages."""
    left_margins = []
    right_margins = []
    top_margins = []
    bottom_margins = []

    for page in pages:
        text_blocks = [b for b in page.get("blocks", []) if b.get("block_type") == "text" and b.get("bbox")]
        if not text_blocks:
            continue

        left_margins.append(min(b["bbox"]["x0"] for b in text_blocks))
        right_margins.append(max(b["bbox"]["x1"] for b in text_blocks))
        top_margins.append(min(b["bbox"]["y0"] for b in text_blocks))
        bottom_margins.append(max(b["bbox"]["y1"] for b in text_blocks))

    def _avg(lst):
        return round(sum(lst) / len(lst)) if lst else 72

    left = _avg(left_margins)
    top = _avg(top_margins)

    right = round(width_pt - _avg(right_margins)) if width_pt else 72
    bottom = round(height_pt - _avg(bottom_margins)) if height_pt else 72

    # Clamp to reasonable values (18pt–144pt)
    def _clamp(v):
        return max(18, min(144, v))

    return {
        "top": _clamp(top),
        "bottom": _clamp(bottom),
        "left": _clamp(left),
        "right": _clamp(right),
    }


def _detect_header_footer(pages: list, height_pt: Optional[float]) -> tuple:
    """
    Detect persistent header and footer blocks.
    Returns (header_present, header_pattern, footer_present, footer_pattern).
    """
    if not pages or not height_pt:
        return False, "", False, ""

    page_count = len(pages)
    threshold = max(2, int(page_count * _HEADER_FOOTER_PAGE_FRACTION))

    # Track y0 ranges of blocks appearing near top / bottom across pages
    top_y_counts: Counter = Counter()
    bottom_y_counts: Counter = Counter()

    for page in pages:
        for block in page.get("blocks", []):
            bbox = block.get("bbox")
            if not bbox or block.get("block_type") != "text":
                continue
            y0_bucket = _bucket(bbox["y0"], _HEADER_FOOTER_Y_TOLERANCE_PT)
            y1_bucket = _bucket(bbox["y1"], _HEADER_FOOTER_Y_TOLERANCE_PT)
            # Top 8% of page
            if bbox["y0"] < height_pt * 0.08:
                top_y_counts[y0_bucket] += 1
            # Bottom 8% of page
            if bbox["y1"] > height_pt * 0.92:
                bottom_y_counts[y1_bucket] += 1

    header_present = any(count >= threshold for count in top_y_counts.values())
    footer_present = any(count >= threshold for count in bottom_y_counts.values())

    return header_present, "repeating" if header_present else "", footer_present, "page_number" if footer_present else ""


def _detect_spacing(pages: list) -> dict:
    """
    Estimate spacing rules by measuring y-gaps between consecutive text blocks.
    Returns a dict of spacing_rules values.
    """
    heading_gaps_before = []
    heading_gaps_after = []
    para_gaps = []

    for page in pages:
        blocks = [b for b in page.get("blocks", []) if b.get("block_type") == "text" and b.get("bbox")]
        for i in range(1, len(blocks)):
            prev = blocks[i - 1]
            curr = blocks[i]
            gap = round(curr["bbox"]["y0"] - prev["bbox"]["y1"], 1)
            if gap <= 0:
                continue

            prev_style = prev.get("style") or {}
            curr_style = curr.get("style") or {}

            prev_is_heading = (prev_style.get("font_size_pt") or 0) >= 13 or prev_style.get("font_weight") == "bold"
            curr_is_heading = (curr_style.get("font_size_pt") or 0) >= 13 or curr_style.get("font_weight") == "bold"

            if curr_is_heading:
                heading_gaps_before.append(gap)
            elif prev_is_heading:
                heading_gaps_after.append(gap)
            else:
                para_gaps.append(gap)

    def _median(lst, default):
        if not lst:
            return default
        s = sorted(lst)
        mid = len(s) // 2
        return round(s[mid], 1)

    return {
        "before_h1_pt": _median(heading_gaps_before, 24.0),
        "after_h1_pt": _median(heading_gaps_after, 12.0),
        "before_h2_pt": _median(heading_gaps_before, 18.0),
        "after_h2_pt": _median(heading_gaps_after, 8.0),
        "paragraph_spacing_pt": _median(para_gaps, 6.0),
        "line_spacing_multiple": 1.15,
    }


def _detect_table_placement(pages: list, width_pt: Optional[float]) -> str:
    """Estimate whether tables are full-width or inline."""
    if not width_pt:
        return "inline"
    text_column_width = width_pt * 0.7  # rough estimate
    for page in pages:
        for block in page.get("blocks", []):
            if block.get("block_type") == "table" and block.get("bbox"):
                block_width = block["bbox"]["x1"] - block["bbox"]["x0"]
                if block_width >= text_column_width:
                    return "full_width"
    return "inline"


async def _claude_layout_fallback(idm: dict, client) -> dict:
    """
    For DOCX (no bboxes), ask Claude to infer layout values from the section structure.
    Returns a partial layout_spec dict.
    """
    sections_summary = []
    for page in idm.get("pages", []):
        for block in page.get("blocks", []):
            text = block.get("text", "")[:80]
            style = block.get("style") or {}
            sections_summary.append({
                "text_preview": text,
                "font_size_pt": style.get("font_size_pt"),
                "font_weight": style.get("font_weight"),
            })

    prompt = (
        "Based on this document's block structure (from a DOCX file with no coordinate data), "
        "infer reasonable layout specification values. Return ONLY a JSON object with these keys:\n"
        '{"page_size": "A4|Letter", "column_structure": "single|two-column", '
        '"spacing_rules": {"before_h1_pt": N, "after_h1_pt": N, "before_h2_pt": N, "after_h2_pt": N, '
        '"paragraph_spacing_pt": N, "line_spacing_multiple": N}, '
        '"header_rule": {"present": bool, "content_pattern": ""}, '
        '"footer_rule": {"present": bool, "content_pattern": ""}}\n\n'
        f"Document blocks (first 30):\n{json.dumps(sections_summary[:30], indent=2)}"
    )

    response = await client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text if response.content else "{}"
    # Strip markdown fences if present
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Layout fallback: could not parse Claude JSON response")
        return {}


async def analyze_layout(idm: dict, client) -> dict:
    """
    Stage C entry point.

    Args:
        idm:    Intermediate Document Model dict from Stage A.
        client: anthropic.AsyncAnthropic instance (used only for DOCX fallback).

    Returns:
        layout_spec dict.
    """
    try:
        pages = idm.get("pages", [])
        metadata = idm.get("metadata", {})
        source_format = idm.get("source_format", "pdf")
        width_pt = metadata.get("width_pt")
        height_pt = metadata.get("height_pt")
        has_bboxes = source_format == "pdf"

        if has_bboxes and pages:
            page_size = metadata.get("page_size", "A4")
            margins = _detect_margins(pages, width_pt, height_pt)
            column_structure = _detect_column_structure(pages)
            header_present, header_pattern, footer_present, footer_pattern = _detect_header_footer(pages, height_pt)
            spacing_rules = _detect_spacing(pages)
            table_placement = _detect_table_placement(pages, width_pt)

            return {
                "page_size": page_size,
                "margins_pt": margins,
                "column_structure": column_structure,
                "section_order": [],  # populated by assembler from content_structure_spec
                "spacing_rules": spacing_rules,
                "header_rule": {"present": header_present, "content_pattern": header_pattern},
                "footer_rule": {"present": footer_present, "content_pattern": footer_pattern},
                "table_placement": table_placement,
                "image_placement": "inline",
            }

        else:
            # DOCX or image — use Claude fallback
            logger.info("Layout analyzer: no bboxes available, using Claude fallback")
            fallback = await _claude_layout_fallback(idm, client)

            return {
                "page_size": fallback.get("page_size", "A4"),
                "margins_pt": fallback.get("margins_pt", {"top": 72, "bottom": 72, "left": 72, "right": 72}),
                "column_structure": fallback.get("column_structure", "single"),
                "section_order": [],
                "spacing_rules": fallback.get("spacing_rules", {
                    "before_h1_pt": 24.0, "after_h1_pt": 12.0,
                    "before_h2_pt": 18.0, "after_h2_pt": 8.0,
                    "paragraph_spacing_pt": 6.0, "line_spacing_multiple": 1.15,
                }),
                "header_rule": fallback.get("header_rule", {"present": False, "content_pattern": ""}),
                "footer_rule": fallback.get("footer_rule", {"present": False, "content_pattern": ""}),
                "table_placement": fallback.get("table_placement", "inline"),
                "image_placement": "inline",
            }

    except Exception as e:
        logger.error(f"Layout analysis failed: {e}")
        raise
