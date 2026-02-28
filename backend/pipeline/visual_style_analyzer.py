"""
Stage D — Visual Style Analyzer

Extracts visual design tokens from the document:
typography (font families, sizes, weights, colors per role),
color palette, and bullet/paragraph style rules.

Primary method: aggregate span-level style metadata from the IDM.
Secondary method: Claude Vision on rendered page images (PDF/image formats),
used to confirm and fill in tokens not available from metadata.

Note: Page-to-PNG rendering uses PyMuPDF directly (no poppler/pdf2image dependency).
"""

import base64
import json
import logging
from collections import Counter, defaultdict
from typing import Optional

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 3000
_VISION_PAGES = 2          # number of pages to render for Claude Vision
_RENDER_SCALE = 1.5        # 108 DPI equivalent — good quality for vision analysis


# ---------------------------------------------------------------------------
# Algorithmic token extraction from IDM spans
# ---------------------------------------------------------------------------

def _classify_role(size_pt: Optional[float], weight: Optional[str]) -> str:
    """Classify a span into a typography role based on size and weight."""
    if size_pt is None:
        return "body"
    if size_pt >= 20:
        return "h1"
    if size_pt >= 15:
        return "h2"
    if size_pt >= 13:
        return "h3"
    if size_pt >= 9:
        return "body" if weight != "bold" else "h3"
    return "caption"


def _extract_tokens_from_idm(idm: dict) -> dict:
    """
    Aggregate font and color data from IDM span styles.
    Returns a dict with:
      - typography_candidates: {role: Counter({(font_name, size_pt, weight, color_hex): char_count})}
      - color_census: Counter({color_hex: char_count})
    """
    # role → (font_name, size_pt, weight, color_hex) → char_count
    role_counters: dict = defaultdict(Counter)
    color_census: Counter = Counter()

    for page in idm.get("pages", []):
        for block in page.get("blocks", []):
            style = block.get("style")
            if not style:
                continue
            text = block.get("text", "")
            if not text:
                continue

            size_pt = style.get("font_size_pt")
            weight = style.get("font_weight", "normal")
            font_name = style.get("font_name") or "unknown"
            color_hex = style.get("color_hex") or "#000000"

            role = _classify_role(size_pt, weight)
            key = (font_name, size_pt, weight, color_hex)
            role_counters[role][key] += len(text)

            # Color census (exclude pure black as it's the default)
            if color_hex and color_hex.upper() not in ("#000000", "#FFFFFF", "#000"):
                color_census[color_hex] += len(text)

    return {
        "role_counters": dict(role_counters),
        "color_census": color_census,
    }


def _build_typography_from_counters(role_counters: dict) -> dict:
    """Pick the most-used token per role."""
    typography = {}
    for role, counter in role_counters.items():
        if not counter:
            continue
        best_key = counter.most_common(1)[0][0]
        font_name, size_pt, weight, color_hex = best_key
        typography[role] = {
            "font_family": font_name if font_name != "unknown" else None,
            "size_pt": size_pt,
            "weight": weight,
            "color_hex": color_hex,
            "inferred": False,
        }
    return typography


def _build_palette_from_census(color_census: Counter) -> dict:
    """Map the top census colors to semantic palette roles."""
    top_colors = [c for c, _ in color_census.most_common(6)]
    palette = {}
    roles = ["primary", "secondary", "accent", "highlight", "muted", "extra"]
    for i, color in enumerate(top_colors):
        if i < len(roles):
            palette[roles[i]] = color
    palette.setdefault("background", "#FFFFFF")
    return palette


# ---------------------------------------------------------------------------
# Claude Vision path
# ---------------------------------------------------------------------------

def _render_pages_to_base64(file_bytes: bytes, n_pages: int = _VISION_PAGES) -> list:
    """
    Render the first n_pages of a PDF to base64-encoded PNGs using PyMuPDF.
    Returns a list of base64 strings (one per page).
    """
    import fitz
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    images = []
    mat = fitz.Matrix(_RENDER_SCALE, _RENDER_SCALE)
    for i, page in enumerate(doc):
        if i >= n_pages:
            break
        pix = page.get_pixmap(matrix=mat)
        png_bytes = pix.tobytes("png")
        images.append(base64.b64encode(png_bytes).decode("utf-8"))
    doc.close()
    return images


_VISION_SYSTEM_PROMPT = """You are a visual design analyst specialising in professional document typography and brand style.

Your task is to examine the provided document page images and return precise visual design tokens as a JSON object.
Focus on: font families, sizes, weights, colors, and structural style patterns.
Return ONLY the JSON object — no markdown, no prose."""

_VISION_USER_TEMPLATE = """Analyse the visual design of these document pages and return a JSON object with this exact structure:

{{
  "typography": {{
    "h1": {{"font_family": "...", "size_pt": N, "weight": "bold|normal", "color_hex": "#RRGGBB"}},
    "h2": {{"font_family": "...", "size_pt": N, "weight": "bold|normal", "color_hex": "#RRGGBB"}},
    "h3": {{"font_family": "...", "size_pt": N, "weight": "bold|normal", "color_hex": "#RRGGBB"}},
    "body": {{"font_family": "...", "size_pt": N, "weight": "normal", "color_hex": "#RRGGBB"}},
    "caption": {{"font_family": "...", "size_pt": N, "weight": "normal", "color_hex": "#RRGGBB"}},
    "table_header": {{"font_family": "...", "size_pt": N, "weight": "bold|normal", "color_hex": "#RRGGBB"}}
  }},
  "color_palette": {{
    "primary": "#RRGGBB",
    "secondary": "#RRGGBB",
    "accent": "#RRGGBB",
    "background": "#FFFFFF",
    "table_header_bg": "#RRGGBB",
    "table_row_alt_bg": "#RRGGBB"
  }},
  "bullet_style": {{"level_1": "•|–|▪|○", "level_2": "–|◦|▸", "indent_pt": N}},
  "paragraph_rules": {{"first_line_indent_pt": N, "space_between_paragraphs_pt": N}}
}}

Candidate values extracted algorithmically (confirm or correct these):
{candidate_json}

Return only the JSON object."""


async def _run_claude_vision(file_bytes: bytes, source_format: str, candidate_tokens: dict, client) -> dict:
    """Call Claude Vision on rendered page images to confirm/fill visual tokens."""
    try:
        if source_format == "pdf":
            page_images = _render_pages_to_base64(file_bytes)
        else:
            # Raw image file
            page_images = [base64.b64encode(file_bytes).decode("utf-8")]

        if not page_images:
            return {}

        # Build content blocks: text + images
        content = [
            {
                "type": "text",
                "text": _VISION_USER_TEMPLATE.format(
                    candidate_json=json.dumps(candidate_tokens, indent=2)
                ),
            }
        ]
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
            max_tokens=MAX_TOKENS,
            system=_VISION_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content}],
        )

        text = response.content[0].text if response.content else "{}"
        # Strip markdown fences
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        return json.loads(text)

    except Exception as e:
        logger.warning(f"Claude Vision call failed: {e}. Falling back to algorithmic tokens.")
        return {}


def _merge_tokens(algorithmic: dict, vision: dict) -> dict:
    """
    Merge algorithmic and vision-derived tokens.
    Vision tokens take precedence for fields they provide; algorithmic fills gaps.
    """
    result = dict(algorithmic)

    # Typography
    alg_typo = algorithmic.get("typography", {})
    vis_typo = vision.get("typography", {})
    merged_typo = dict(alg_typo)
    for role, vis_token in vis_typo.items():
        if role not in merged_typo:
            merged_typo[role] = {**vis_token, "inferred": True}
        else:
            # Vision confirms or overrides
            alg_token = dict(merged_typo[role])
            for field in ("font_family", "size_pt", "weight", "color_hex"):
                if vis_token.get(field) is not None:
                    alg_token[field] = vis_token[field]
            alg_token["inferred"] = False
            merged_typo[role] = alg_token
    result["typography"] = merged_typo

    # Color palette
    alg_palette = algorithmic.get("color_palette", {})
    vis_palette = vision.get("color_palette", {})
    result["color_palette"] = {**alg_palette, **vis_palette}

    # Bullet style
    if "bullet_style" in vision:
        result["bullet_style"] = vision["bullet_style"]
    elif "bullet_style" not in result:
        result["bullet_style"] = {"level_1": "•", "level_2": "–", "indent_pt": 18.0}

    # Paragraph rules
    if "paragraph_rules" in vision:
        result["paragraph_rules"] = vision["paragraph_rules"]
    elif "paragraph_rules" not in result:
        result["paragraph_rules"] = {"first_line_indent_pt": 0.0, "space_between_paragraphs_pt": 6.0}

    return result


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def analyze_visual_style(file_bytes: bytes, source_format: str, idm: dict, client) -> dict:
    """
    Stage D entry point.

    Args:
        file_bytes:     Raw file bytes (needed for Claude Vision rendering).
        source_format:  "pdf" | "docx" | "image".
        idm:            Intermediate Document Model dict from Stage A.
        client:         anthropic.AsyncAnthropic instance.

    Returns:
        visual_style_spec dict.
    """
    try:
        # Step 1: algorithmic extraction from IDM metadata
        extracted = _extract_tokens_from_idm(idm)
        alg_typography = _build_typography_from_counters(extracted["role_counters"])
        alg_palette = _build_palette_from_census(extracted["color_census"])

        algorithmic_tokens = {
            "typography": alg_typography,
            "color_palette": alg_palette,
            "bullet_style": {"level_1": "•", "level_2": "–", "indent_pt": 18.0},
            "paragraph_rules": {"first_line_indent_pt": 0.0, "space_between_paragraphs_pt": 6.0},
        }

        # Step 2: Claude Vision for PDF and image formats (fills gaps, confirms values)
        vision_tokens = {}
        if source_format in ("pdf", "image", "jpg", "jpeg", "png"):
            logger.info("Visual style analyzer: running Claude Vision pass")
            vision_tokens = await _run_claude_vision(file_bytes, source_format, algorithmic_tokens, client)

        # Step 3: merge
        final_tokens = _merge_tokens(algorithmic_tokens, vision_tokens)

        # Ensure required roles exist with sentinel values if missing
        for role in ("h1", "body"):
            if role not in final_tokens.get("typography", {}):
                final_tokens.setdefault("typography", {})[role] = {
                    "font_family": None,
                    "size_pt": None,
                    "weight": "bold" if role == "h1" else "normal",
                    "color_hex": "#000000",
                    "inferred": True,
                }

        return final_tokens

    except Exception as e:
        logger.error(f"Visual style analysis failed: {e}")
        raise
