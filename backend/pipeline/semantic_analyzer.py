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

The document text uses this format:
- '--- PAGE N ---' marks a new page boundary
- '[H {size}pt {bold?}] {heading text}' marks a detected heading with its font size
- All other lines are body text

Rules (follow these strictly):
1. Create exactly one section entry for EVERY heading line (lines starting with '[H '). Never merge, skip, or consolidate headings.
2. Use the EXACT heading text as the section 'title' — do not paraphrase or rename it.
3. Determine 'depth' from font size: scan all heading sizes in the document, then assign depth 1 to the largest, depth 2 to the next, depth 3 to smaller sizes. If two headings share a size, give them the same depth.
4. A heading that appears after a larger heading on the same or adjacent page is likely a child_section of that larger heading — nest it accordingly.
5. Cover page or introductory headings (title, subtitle) should be depth 1 sections.
6. A document with 8-10 pages should typically yield at least 8-12 distinct sections — if you find fewer than 5 heading markers, re-examine the text carefully.
7. 'intent' must be a specific lowercase phrase (not generic) — e.g. 'company overview', 'role mandate', 'reporting structure', 'candidate requirements', 'competency profile', 'compensation', 'firm overview'. Never use 'content' alone as intent.
8. 'rhetorical_pattern' describes how content flows within the section (e.g. 'context → key facts → relevance', 'criteria → must-have → nice-to-have').
9. 'micro_template' is a practical instruction a writer can follow to produce similar content for a new engagement (e.g. 'Open with a 2-sentence company description. Follow with key facts: size, market position, ownership structure.').
10. Always call the tool — never return plain text."""


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

    Format used:
    - '--- PAGE N ---' marks each page boundary so Claude can reason about page-level structure.
    - '[H {size_pt}pt bold?] {text}' marks a detected heading with its font size so Claude can
      determine hierarchy (larger font = higher depth level).
    - All other text is emitted as plain body text.
    """
    parts = []
    char_count = 0

    for page in idm.get("pages", []):
        page_num = page.get("page_number", "?")
        page_parts = []

        for block in page.get("blocks", []):
            text = block.get("text", "").strip()
            if not text:
                continue

            if _is_heading(block):
                style = block.get("style") or {}
                size = style.get("font_size_pt")
                weight = style.get("font_weight", "normal")
                size_str = f"{size}pt " if size else ""
                weight_str = "bold " if weight == "bold" else ""
                page_parts.append(f"[H {size_str}{weight_str}] {text}")
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

    return "\n".join(parts)


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
