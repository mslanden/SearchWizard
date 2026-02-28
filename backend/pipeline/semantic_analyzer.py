"""
Stage B — Semantic Analyzer

Analyzes the Intermediate Document Model to produce a Content Structure Spec:
section hierarchy, intent, allowed element types, and rhetorical patterns.

Uses Claude with tool-use (function calling) to enforce structured JSON output.
"""

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 4000
MAX_TEXT_CHARS = 12000  # max condensed doc text sent to Claude

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

Your task is to analyse the text of a document and call the 'document_structure' tool to return a precise, structured representation of its content architecture.

Guidelines:
- Identify every major section in the document, even if it has no explicit heading.
- Infer the heading text from context when the document uses visual cues rather than explicit titles.
- Assign 'depth' based on heading hierarchy: top-level sections = 1, sub-sections = 2, etc.
- 'intent' should be a single lowercase word or short phrase describing the section's purpose.
- 'rhetorical_pattern' should describe how content flows within the section (e.g. 'situation → complication → resolution').
- 'micro_template' should be a practical instruction a writer can follow to produce similar content.
- Always call the tool — never return plain text."""


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
    Flatten IDM pages/blocks into a condensed text representation for semantic analysis.
    Headings are marked with '=== ... ===' to help Claude identify section boundaries.
    """
    parts = []
    char_count = 0

    for page in idm.get("pages", []):
        for block in page.get("blocks", []):
            text = block.get("text", "").strip()
            if not text:
                continue

            if _is_heading(block):
                parts.append(f"\n=== {text} ===\n")
            else:
                parts.append(text)

            char_count += len(text)
            if char_count >= MAX_TEXT_CHARS:
                parts.append("\n[...document truncated for analysis...]")
                break
        if char_count >= MAX_TEXT_CHARS:
            break

    return "\n".join(parts)


async def analyze_semantic(idm: dict, client) -> dict:
    """
    Stage B entry point.

    Args:
        idm:    Intermediate Document Model dict from Stage A.
        client: anthropic.AsyncAnthropic instance.

    Returns:
        content_structure_spec dict with a 'sections' list.
    """
    try:
        condensed_text = _condense_idm_to_text(idm)

        if not condensed_text.strip():
            logger.warning("Semantic analyzer: IDM has no text content, returning minimal structure")
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

        user_message = (
            f"Analyse the following document and call the 'document_structure' tool "
            f"to return its complete section hierarchy.\n\n"
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

        logger.error("Semantic analyzer: could not extract structured output from Claude response")
        raise ValueError("Claude did not return a valid document_structure tool call")

    except Exception as e:
        logger.error(f"Semantic analysis failed: {e}")
        raise
