"""
Stage B — Semantic Analyzer

Analyzes the Intermediate Document Model to produce a Content Structure Spec:
section hierarchy, intent, allowed element types, and rhetorical patterns.

Uses Claude with tool-use (function calling) to enforce structured JSON output.
"""

import json
from typing import Any


CLAUDE_MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 12000
MAX_TEXT_CHARS = 50000  # max condensed doc text sent to Claude (Sonnet 4.6 has 200K context)

# Heading heuristic thresholds
_HEADING_MIN_SIZE_PT = 13.0
_HEADING_MAX_TEXT_LEN = 120

# Tool schema for structured Claude output
_STRUCTURE_TOOL = {
    "name": "document_structure",
    "description": (
        "Extract and return the complete DNA of the document: a document-level profile "
        "(purpose, audience, writing style, voice) and a hierarchical sections array "
        "(one entry per heading, with detailed intent, phrasing, formatting, and generation guidance). "
        "Together these define everything needed to reproduce a similar document for a new engagement."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "document_profile": {
                "type": "object",
                "description": "High-level characterisation of the document as a whole.",
                "properties": {
                    "purpose": {
                        "type": "string",
                        "description": (
                            "What this document is designed to achieve and its role in the recruitment process. "
                            "Name the document type, its function, and what the reader gains from it. "
                            "E.g., 'Executive search role specification for a CTO position at a PE-backed SaaS "
                            "company. Presented to senior technology candidates to convey company context, role "
                            "mandate, and candidate requirements, enabling informed self-qualification before "
                            "first-round interviews.'"
                        )
                    },
                    "audience": {
                        "type": "string",
                        "description": (
                            "The primary reader — who they are, what they already know, and what they need "
                            "from this document to take the desired action. "
                            "E.g., 'Senior technology executives (CTO/VP Engineering level) being considered "
                            "for the role. Expects strategic framing, commercial context, clear reporting "
                            "structure, and specificity about scope and equity opportunity.'"
                        )
                    },
                    "writing_style": {
                        "type": "string",
                        "description": (
                            "The overall stylistic register of the document. Describe formality level, "
                            "sentence structure, use of concrete specifics vs abstract language, and tone. "
                            "E.g., 'Formal consultant-authored narrative. Uses declarative sentences and "
                            "grounds claims in specific facts (headcount, AUM, product names, revenue). "
                            "Professional but not bureaucratic. Avoids superlatives and filler phrases.'"
                        )
                    },
                    "voice": {
                        "type": "string",
                        "description": (
                            "Grammatical voice and person, and how this varies across sections. "
                            "E.g., 'Third-person throughout. Company and role sections use declarative "
                            "third-person. Candidate profile uses gendered third-person pronoun (S/he). "
                            "Passive constructions used for compensation and location. Authoritative throughout.'"
                        )
                    }
                },
                "required": ["purpose", "audience", "writing_style", "voice"]
            },
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
                            "description": (
                                "The exact heading text of the section as it appears in the document. "
                                "Do not paraphrase or normalise."
                            )
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
                                "2–4 sentences describing the section's specific purpose. "
                                "Explain WHAT information it communicates, WHY it is included in this type "
                                "of document, and HOW it serves the reader's decision-making or understanding. "
                                "E.g., 'Establishes the client company's market position, ownership structure, "
                                "and strategic growth trajectory following a recent acquisition. Helps candidates "
                                "assess commercial and cultural fit before committing to the process. "
                                "Sets the business context that motivates the hire and frames the role mandate.'"
                            )
                        },
                        "phrasing_style": {
                            "type": "string",
                            "description": (
                                "A concise descriptor of how prose is written in this specific section. "
                                "Include: voice (active/passive), person (first/second/third), "
                                "register (formal/conversational/directive), and sentence structure. "
                                "E.g., 'Formal third-person declarative. Dense factual sentences with "
                                "named entities (companies, people, figures). No hedging language.' "
                                "or 'Third-person with S/he pronoun. Aspirational and directive. "
                                "Compound sentences with parallel structure.'"
                            )
                        },
                        "rhetorical_pattern": {
                            "type": "string",
                            "description": (
                                "The narrative or argumentative flow within this section. "
                                "E.g., 'context → ownership structure → market position → strategic outlook', "
                                "'mandate → scope → key responsibilities → success criteria', "
                                "'criteria → must-have table → nice-to-have table'."
                            )
                        },
                        "content_guidelines": {
                            "type": "string",
                            "description": (
                                "Precise formatting instructions for this section's content. "
                                "Describe the exact use of any tables (column headers, typical row count, "
                                "cell content length and type), bullet lists (nesting level, typical item "
                                "count, item length), numbered lists, or prose paragraphs (count, length). "
                                "E.g., 'Two-column table with headers Must Have and Nice to Have. Each row "
                                "is a 1–2 sentence competency statement. Typically 5–8 rows per table. "
                                "Rows are grouped into Critical Experiences and Personal Attributes categories.' "
                                "or '3–4 prose paragraphs of 4–6 sentences each. No bullets. Each paragraph "
                                "covers a distinct responsibility area.'"
                            )
                        },
                        "micro_template": {
                            "type": "string",
                            "description": (
                                "Step-by-step instructions a writer can follow to produce the content "
                                "of this section for a new engagement, using only the available project artifacts. "
                                "E.g., 'Open with a 2-sentence company description (sector + market position). "
                                "Follow with 3–4 factual statements: ownership structure, employee headcount, "
                                "flagship product, recent strategic event. Close with 1 sentence on growth "
                                "direction or the commercial rationale for this hire.'"
                            )
                        },
                        "allowed_element_types": {
                            "type": "array",
                            "description": "Types of content elements present in this section.",
                            "items": {
                                "type": "string",
                                "enum": ["paragraph", "bullet_list", "numbered_list", "table", "image", "quote", "heading"]
                            }
                        },
                        "child_sections": {
                            "type": "array",
                            "description": "Nested sub-sections (same schema as parent).",
                            "items": {}
                        }
                    },
                    "required": ["section_id", "title", "depth", "intent", "phrasing_style",
                                 "allowed_element_types", "rhetorical_pattern", "content_guidelines",
                                 "micro_template"]
                }
            }
        },
        "required": ["document_profile", "sections"]
    }
}

_SYSTEM_PROMPT = """You are a document structure analyst specialising in professional recruitment and business documents. Your output is used to reproduce similar documents for new engagements — so precision and completeness are essential.

Your task is to analyse the structured text of a document and call the 'document_structure' tool to return the document's complete DNA: a document-level profile and a full hierarchical section map.

The document text shows each block prefixed with its font size: '[12.5pt] text content'. Page boundaries are marked '--- PAGE N ---'.

━━━ STEP 1: IDENTIFY ALL HEADINGS ━━━

To find headings:
- Identify the body text size — the most common font size in the document, typically 9–12pt.
- Any block at roughly 1.4× or more above the body size is a section heading.
- Larger font sizes = higher-level headings (depth 1); smaller oversized fonts = sub-headings (depth 2–3).
- Short lines that appear to introduce a new topic — even at body size — may be sub-headings if they are followed by indented or structured content.
- A document with 8–10 pages should yield at least 8–12 distinct headings. If you find fewer than 5, re-examine the font sizes carefully.

━━━ STEP 2: COMPLETE THE DOCUMENT PROFILE ━━━

Fill in 'document_profile' with a characterisation of the document as a whole. Be specific and substantive — avoid generic descriptions.

- purpose: What the document achieves and its precise role in the recruitment process.
- audience: The primary reader, what they already know, and what they need from this document.
- writing_style: Formality level, sentence structure, use of concrete specifics vs abstract language, overall tone.
- voice: Grammatical voice and person across sections; note any variation between sections.

━━━ STEP 3: EXTRACT AND DESCRIBE EVERY SECTION ━━━

Create exactly one section entry for EVERY heading identified in Step 1. Never merge, skip, or consolidate headings.

For each section:
- title: Use the EXACT heading text from the document. Do not paraphrase.
- depth: 1 for top-level headings (largest font), 2 for sub-headings, 3 for sub-sub-headings.
- child_sections: Nest smaller headings under the larger heading that precedes them on the same page.
- intent: 2–4 sentences — WHAT this section communicates, WHY it appears in this document type, and HOW it serves the reader. Be specific about the content, not just the category.
- phrasing_style: How prose is written in this section — voice (active/passive), person (first/second/third), register (formal/directive/conversational), and sentence structure. A concise descriptor a writer can follow.
- rhetorical_pattern: The logical flow of content within the section (e.g. 'context → ownership → market position → strategic outlook', 'mandate → scope → responsibilities → success criteria', 'criteria → must-have table → nice-to-have table').
- content_guidelines: Precise formatting instructions. Describe any tables (exact column headers, typical row count, cell content type and length), bullet lists (nesting level, item count, item length), or prose structure (paragraph count, sentence length). Specific enough to replicate for a new engagement.
- micro_template: Step-by-step instructions to write this section from scratch using project artifacts. Concrete and actionable.
- allowed_element_types: List all element types present.

Always call the tool — never return plain text."""


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
