"""
Stage B — Semantic Analyzer

Analyzes the Intermediate Document Model to produce a Content Structure Spec:
section hierarchy, intent, allowed element types, and rhetorical patterns.

Uses Claude with tool-use (function calling) to enforce structured JSON output.
"""

import json
from typing import Any


CLAUDE_MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 8000
MAX_TEXT_CHARS = 50000  # max condensed doc text sent to Claude (Sonnet 4.6 has 200K context)

# Heading heuristic thresholds
_HEADING_MIN_SIZE_PT = 13.0
_HEADING_MAX_TEXT_LEN = 120

# Tool schema for structured Claude output
_STRUCTURE_TOOL = {
    "name": "document_structure",
    "description": (
        "Extract and return the complete content structure of the document as a JSON object "
        "with a 'sections' array. Each section describes a logical division of the document."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "sections": {
                "type": "array",
                "description": "Ordered list of top-level and nested document sections.",
                "items": {
                    "type": "object",
                    "properties": {
                        "section_id": {
                            "type": "string",
                            "description": "Short unique ID, e.g. 's1', 's2', 's1_1'."
                        },
                        "title": {
                            "type": "string",
                            "description": "The heading text of the section."
                        },
                        "depth": {
                            "type": "integer",
                            "description": "Heading depth: 1 = top-level, 2 = sub-section, 3 = sub-sub-section.",
                            "minimum": 1,
                            "maximum": 4
                        },
                        "intent": {
                            "type": "string",
                            "description": (
                                "The rhetorical purpose of this section, e.g. 'summary', "
                                "'background', 'recommendation', 'profile', 'qualifications', "
                                "'evidence', 'introduction', 'conclusion'."
                            )
                        },
                        "allowed_element_types": {
                            "type": "array",
                            "description": "Types of content elements typically found in this section.",
                            "items": {
                                "type": "string",
                                "enum": ["paragraph", "bullet_list", "numbered_list", "table", "image", "quote", "heading"]
                            }
                        },
                        "rhetorical_pattern": {
                            "type": "string",
                            "description": (
                                "The typical narrative or argumentative pattern used, "
                                "e.g. 'context → finding → implication', "
                                "'problem → solution → benefit', 'claim → evidence → conclusion'."
                            )
                        },
                        "micro_template": {
                            "type": "string",
                            "description": (
                                "A brief instruction for generating this section's content, "
                                "e.g. 'Open with a one-sentence executive summary. Follow with "
                                "3-5 bullet points highlighting key findings.'"
                            )
                        },
                        "child_sections": {
                            "type": "array",
                            "description": "Nested sub-sections (same schema as parent).",
                            "items": {}
                        }
                    },
                    "required": ["section_id", "title", "depth", "intent",
                                 "allowed_element_types", "rhetorical_pattern", "micro_template"]
                }
            }
        },
        "required": ["sections"]
    }
}

_SYSTEM_PROMPT = """You are a document structure analyst specialising in professional recruitment and business documents.

Your task is to analyse the structured text of a document and call the 'document_structure' tool to return a precise, hierarchical representation of its content architecture.

The document text shows each block prefixed with its font size: '[12.5pt] text content'. Page boundaries are marked '--- PAGE N ---'.

How to identify headings:
- First, identify the body text size — the most common font size in the document, typically 9–12pt.
- Any block whose font size is notably larger than the body text (roughly 1.4× or more) is a section heading.
- Larger sizes = higher-level headings (depth 1); smaller oversized sizes = sub-headings (depth 2 or 3).
- Short bold lines at body size may also be sub-headings — use content context to decide.
- Pages with no oversized font blocks contain only body text belonging to the previous heading's section.

Rules (follow these strictly):
1. Create exactly one section entry for EVERY identified heading. Never merge or skip headings.
2. Use the EXACT heading text as the section 'title' — do not paraphrase or rename it.
3. Determine 'depth' from relative font size: largest headings = depth 1, next tier = depth 2, smaller = depth 3.
4. A heading that follows a larger heading on the same or adjacent page is a child_section of that larger heading.
5. A document with 8–10 pages should yield at least 8–12 sections — if you count fewer than 5, re-examine the font sizes carefully.
6. 'intent' must be a specific lowercase phrase — e.g. 'company overview', 'role mandate', 'reporting structure', 'candidate requirements', 'competency profile', 'compensation', 'firm overview'. Never use just 'content'.
7. 'rhetorical_pattern' describes how content flows within the section (e.g. 'context → key facts → relevance', 'criteria → must-have → nice-to-have').
8. 'micro_template' is a practical instruction a writer can follow to produce similar content for a new engagement.
9. Always call the tool — never return plain text."""


def _is_heading(block: dict) -> bool:
    """Heuristic: is this block a heading?"""
    style = block.get("style") or {}
    text = block.get("text", "")
    size = style.get("font_size_pt") or 0
    weight = style.get("font_weight", "normal")
    if not text or len(text) > _HEADING_MAX_TEXT_LEN:
        return False
    if size >= _HEADING_MIN_SIZE_PT:
        return True
    if weight == "bold" and len(text) < 80:
        return True
    return False


def _condense_idm_to_text(idm: dict) -> str:
    """
    Flatten IDM pages/blocks into a structured text representation for semantic analysis.

    Every block is prefixed with its font size so Claude can determine heading hierarchy
    from the size distribution itself, without relying on a pre-classification heuristic.

    Format:
    - '--- PAGE N ---' marks each page boundary
    - '[{size_pt}pt] {text}' for blocks with known font size
    - '{text}' (no prefix) for blocks without style info (e.g. extracted tables)
    """
    parts = []
    char_count = 0
    unique_sizes: set = set()

    for page in idm.get("pages", []):
        page_num = page.get("page_number", "?")
        page_parts = []

        for block in page.get("blocks", []):
            text = block.get("text", "").strip()
            if not text:
                continue

            style = block.get("style")
            size = style.get("font_size_pt") if style else None
            if size:
                unique_sizes.add(size)
                page_parts.append(f"[{size}pt] {text}")
            else:
                page_parts.append(text)

            char_count += len(text)
            if char_count >= MAX_TEXT_CHARS:
                page_parts.append("[...document truncated for analysis...]")
                break

        if page_parts:
            parts.append(f"--- PAGE {page_num} ---")
            parts.extend(page_parts)

        if char_count >= MAX_TEXT_CHARS:
            break

    condensed = "\n".join(parts)
    print(
        f"Semantic analyzer: condensed text {len(condensed)} chars, "
        f"{len(parts)} blocks across pages, "
        f"unique font sizes: {sorted(unique_sizes)}"
    )
    return condensed


async def analyze_semantic(idm: dict, client, document_type: str = "") -> dict:
    """
    Stage B entry point.

    Args:
        idm:            Intermediate Document Model dict from Stage A.
        client:         anthropic.AsyncAnthropic instance.
        document_type:  Golden example type slug, e.g. "role_specification".

    Returns:
        content_structure_spec dict with a 'sections' list.
    """
    try:
        condensed_text = _condense_idm_to_text(idm)

        if not condensed_text.strip():
            print("Semantic analyzer: IDM has no text content, returning minimal structure")
            return {
                "sections": [{
                    "section_id": "s1",
                    "title": "Document Content",
                    "depth": 1,
                    "intent": "content",
                    "allowed_element_types": ["paragraph"],
                    "rhetorical_pattern": "narrative",
                    "micro_template": "Provide the main document content.",
                    "child_sections": [],
                }]
            }

        doc_type_line = f"DOCUMENT TYPE: {document_type}\n\n" if document_type else ""
        user_message = (
            f"Analyse the following document and call the 'document_structure' tool "
            f"to return its complete section hierarchy.\n\n"
            f"{doc_type_line}"
            f"DOCUMENT TEXT:\n{condensed_text}"
        )

        response = await client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=MAX_TOKENS,
            system=_SYSTEM_PROMPT,
            tools=[_STRUCTURE_TOOL],
            tool_choice={"type": "tool", "name": "document_structure"},
            messages=[{"role": "user", "content": user_message}],
        )

        # Extract tool use result
        for block in response.content:
            if block.type == "tool_use" and block.name == "document_structure":
                return block.input

        # Fallback: try to parse text response as JSON
        for block in response.content:
            if hasattr(block, "text"):
                try:
                    data = json.loads(block.text)
                    if "sections" in data:
                        return data
                except json.JSONDecodeError:
                    pass

        print("Semantic analyzer: could not extract structured output from Claude response")
        raise ValueError("Claude did not return a valid document_structure tool call")

    except Exception as e:
        print(f"Semantic analysis failed: {e}")
        raise
