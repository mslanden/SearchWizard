"""
Stage B — Semantic Analyzer

Analyzes the Intermediate Document Model to produce a Content Structure Spec:
section hierarchy, intent, allowed element types, and rhetorical patterns.

Uses Claude with tool-use (function calling) to enforce structured JSON output.
"""

import base64
import json
from typing import Any


CLAUDE_MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 12000
MAX_TEXT_CHARS = 50000  # max condensed doc text sent to Claude (Sonnet 4.6 has 200K context)

# Vision rendering — used when the PDF has too little extractable text
_VISION_PAGES = 8          # render up to 8 pages (covers a typical 8–10 page role spec)
_VISION_RENDER_SCALE = 1.0 # 72 DPI — sufficient for Claude to read headings

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
                                "'overview → required attributes → preferred attributes'."
                            )
                        },
                        "content_guidelines": {
                            "type": "string",
                            "description": (
                                "Precise formatting instructions for this section's content. "
                                "Describe the exact use of any tables (column headers, typical row count, "
                                "cell content length and type), bullet lists (nesting level, typical item "
                                "count, item length), numbered lists, or prose paragraphs (count, length). "
                                "E.g., 'Two-column table with 6–8 rows; left column states the requirement "
                                "(1 sentence), right column states expected evidence or priority (1 sentence).' "
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

Use ALL FOUR signals below — not font size alone. In design-heavy PDFs, font size is often unreliable; the textual signals are equally important.

SIGNAL A — FONT SIZE
Identify the body text size (the most common font size, typically 9–12pt). Any block at 1.4× or more above the body size is a heading. Larger = higher-level (depth 1); smaller oversized = sub-headings (depth 2–3).

SIGNAL B — EMBEDDED HEADING PATTERN
In design-heavy PDFs, a heading and its body text are often merged into a single extracted block. Look for a SHORT PHRASE (2–6 words) at the very start of a block, immediately followed by a longer explanatory sentence or paragraph that elaborates on it. The short phrase is the section heading. Example: a block that begins "Role Location" and continues with a longer sentence about office locations — "Role Location" is a section heading.

SIGNAL C — STANDALONE SHORT BLOCKS
A text block shorter than ~40 characters appearing immediately before a longer block is almost certainly a heading, even at body size.

SIGNAL D — SEMANTIC RECOGNITION (most reliable for design PDFs)
You are reading a professional recruitment or business document and you understand what these documents contain. Use your understanding of the document's meaning to identify where one major topic ends and another begins — even when typography provides no signal. Sections in these documents typically cover topics such as: the company background, the role mandate, key responsibilities, candidate requirements, compensation, location, and process. When you read a paragraph whose content clearly introduces a new top-level subject, that signals a new section regardless of font size. Trust your language understanding.

CRITICAL — what is NOT a heading:
- Category labels or row-group labels within a table (bold text grouping rows inside a two-column table)
- Bullet list subheadings or bold inline phrases within a paragraph
- Only text that introduces an entirely new major topic, standing independently before its content, qualifies as a section

A 6–10 page document should yield at least 5–10 distinct sections. If you find fewer than 4, re-examine using Signals B, C, and D.

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
- rhetorical_pattern: The logical flow of content within the section (e.g. 'context → ownership → market position → strategic outlook', 'mandate → scope → responsibilities → success criteria', 'overview → required attributes → preferred attributes').
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


def _render_pdf_pages_for_vision(file_bytes: bytes, n_pages: int = _VISION_PAGES) -> list:
    """
    Render the first n_pages of a PDF to base64-encoded PNGs using PyMuPDF.
    Returns a list of base64 strings (one per page).
    Mirrors visual_style_analyzer._render_pages_to_base64().
    """
    import fitz
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    images = []
    mat = fitz.Matrix(_VISION_RENDER_SCALE, _VISION_RENDER_SCALE)
    for i, page in enumerate(doc):
        if i >= n_pages:
            break
        pix = page.get_pixmap(matrix=mat)
        images.append(base64.b64encode(pix.tobytes("png")).decode("utf-8"))
    doc.close()
    return images


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
            reported_size = style.get("font_size_pt") if style else None

            # Derive font size from bounding-box geometry as a fallback.
            # Design-heavy PDFs (InDesign exports) often scale text frames after
            # embedding, so PyMuPDF reports the base font size (e.g. 10pt) rather
            # than the rendered size (e.g. 40pt). Bbox height ÷ line count ÷ 1.2
            # (typical leading factor) gives the approximate rendered font size.
            bbox = block.get("bbox") or {}
            lines = block.get("lines") or []
            num_lines = max(len(lines), 1)
            bbox_h = (bbox.get("y1", 0) - bbox.get("y0", 0))
            bbox_size = round(bbox_h / num_lines / 1.2, 1) if bbox_h > 4 else None

            # Use the larger of the two estimates. For correct PDFs they agree;
            # for transformed PDFs the bbox estimate reveals the true rendered size.
            size = max(reported_size or 0, bbox_size or 0) or None

            if size:
                unique_sizes.add(round(size, 1))
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


async def analyze_semantic(
    idm: dict,
    client,
    document_type: str = "",
    file_bytes: bytes = None,
    source_format: str = "",
) -> dict:
    """
    Stage B entry point.

    Args:
        idm:            Intermediate Document Model dict from Stage A.
        client:         anthropic.AsyncAnthropic instance.
        document_type:  Golden example type slug, e.g. "role_specification".
        file_bytes:     Raw file bytes — required for PDF Vision rendering.
        source_format:  "pdf" | "docx" | "image" (from IDM metadata).

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

        # Include PDF bookmarks/outline when available — these are the most reliable
        # source of section titles and hierarchy, independent of font-size extraction.
        toc = idm.get("metadata", {}).get("toc", [])
        if toc:
            indent = lambda lvl: "  " * (lvl - 1)
            toc_lines = "\n".join(
                f"{indent(e['level'])}{e['title']} (page {e['page']})"
                for e in toc
            )
            toc_section = (
                f"PDF TABLE OF CONTENTS (from embedded bookmarks — "
                f"these are the authoritative section titles and hierarchy):\n"
                f"{toc_lines}\n\n"
            )
            print(f"Semantic analyzer: using TOC with {len(toc)} entries as section guide")
        else:
            toc_section = ""

        # For PDF files, render pages as images so Claude can see decorative headings
        # that are not captured in the text extraction (common in InDesign-exported PDFs).
        page_images = []
        if source_format == "pdf" and file_bytes:
            try:
                page_images = _render_pdf_pages_for_vision(file_bytes)
                print(f"Semantic analyzer: rendered {len(page_images)} pages for vision analysis")
            except Exception as e:
                print(f"Semantic analyzer: page rendering failed ({e}), using text-only")

        # Build the user message — multimodal when images are available
        intro = (
            f"Analyse the following document and call the 'document_structure' tool "
            f"to return its complete section hierarchy.\n\n"
            f"{doc_type_line}"
            f"{toc_section}"
        )

        if page_images:
            intro += (
                "DOCUMENT PAGES (images — primary source for heading identification):\n"
                "The page images below show the full visual layout of the document. "
                "Large, prominently displayed text that introduces a new topic is a section "
                "heading even if it does not appear in the extracted text below. "
                "Use the images as your primary source for identifying section structure.\n\n"
            )
            user_content = [{"type": "text", "text": intro}]
            for img_b64 in page_images:
                user_content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": img_b64,
                    },
                })
            user_content.append({
                "type": "text",
                "text": f"EXTRACTED TEXT (supplementary — may be incomplete for design-heavy PDFs):\n{condensed_text}",
            })
        else:
            user_content = intro + f"DOCUMENT TEXT:\n{condensed_text}"

        response = await client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=MAX_TOKENS,
            system=_SYSTEM_PROMPT,
            tools=[_STRUCTURE_TOOL],
            tool_choice={"type": "tool", "name": "document_structure"},
            messages=[{"role": "user", "content": user_content}],
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
