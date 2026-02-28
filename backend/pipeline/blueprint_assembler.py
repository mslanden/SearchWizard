"""
Stage E — Blueprint Assembler

Merges the outputs of Stages B, C, and D into a validated JSON Blueprint.

Responsibilities beyond simple merging:
1. Bind section IDs from ContentStructureSpec into LayoutSpec.section_order.
2. Bind typography depth levels to section hierarchy (depth → h1/h2/h3/body).
3. Flag inferred/uncertain tokens with {"inferred": True}.
4. Renderer-readiness validation: fill missing required fields with sentinel values.
5. Return the complete JSONBlueprint dict.
"""

import uuid
import logging
import datetime

logger = logging.getLogger(__name__)

_DEPTH_TO_ROLE = {1: "h1", 2: "h2", 3: "h3", 4: "body"}


def _sentinel(value=None) -> dict:
    """Return a sentinel dict for missing required fields."""
    return {"value": value, "inferred": True}


def _flag_low_occurrence_tokens(visual_spec: dict, idm: dict) -> dict:
    """
    Mark typography tokens as inferred if the underlying font appears fewer than
    2 times in the IDM (low confidence).
    """
    # Build a font occurrence counter from IDM
    from collections import Counter
    font_counts: Counter = Counter()
    for page in idm.get("pages", []):
        for block in page.get("blocks", []):
            style = block.get("style") or {}
            font = style.get("font_name")
            if font:
                font_counts[font] += 1

    typography = visual_spec.get("typography", {})
    for role, token in typography.items():
        if isinstance(token, dict):
            font = token.get("font_family")
            if font and font_counts.get(font, 0) < 2:
                token["inferred"] = True
    return visual_spec


def _bind_sections_to_layout(content_spec: dict, layout_spec: dict) -> tuple:
    """
    1. Set layout_spec.section_order from the ordered section IDs in content_spec.
    2. Add typography_role to each section based on its depth.
    Returns updated (content_spec, layout_spec).
    """
    sections = content_spec.get("sections", [])
    section_order = []

    def _process_sections(section_list: list):
        for section in section_list:
            section_id = section.get("section_id", "")
            depth = section.get("depth", 1)
            section["typography_role"] = _DEPTH_TO_ROLE.get(depth, "body")
            if section_id:
                section_order.append(section_id)
            children = section.get("child_sections", [])
            if children:
                _process_sections(children)

    _process_sections(sections)
    layout_spec["section_order"] = section_order
    return content_spec, layout_spec


def _validate_layout_spec(layout_spec: dict) -> dict:
    """Ensure all required layout_spec fields are present."""
    # margins_pt
    margins = layout_spec.get("margins_pt", {})
    for key in ("top", "bottom", "left", "right"):
        if key not in margins or margins[key] is None:
            margins[key] = 72
    layout_spec["margins_pt"] = margins

    # spacing_rules
    spacing = layout_spec.get("spacing_rules", {})
    defaults = {
        "before_h1_pt": 24.0, "after_h1_pt": 12.0,
        "before_h2_pt": 18.0, "after_h2_pt": 8.0,
        "paragraph_spacing_pt": 6.0, "line_spacing_multiple": 1.15,
    }
    for k, v in defaults.items():
        spacing.setdefault(k, v)
    layout_spec["spacing_rules"] = spacing

    layout_spec.setdefault("page_size", "A4")
    layout_spec.setdefault("column_structure", "single")
    layout_spec.setdefault("table_placement", "inline")
    layout_spec.setdefault("image_placement", "inline")
    layout_spec.setdefault("header_rule", {"present": False, "content_pattern": ""})
    layout_spec.setdefault("footer_rule", {"present": False, "content_pattern": ""})

    return layout_spec


def _validate_visual_spec(visual_spec: dict) -> dict:
    """Ensure h1 and body typography tokens exist; fill with sentinels if missing."""
    typography = visual_spec.setdefault("typography", {})

    for required_role in ("h1", "body"):
        if required_role not in typography or not typography[required_role]:
            typography[required_role] = {
                "font_family": None,
                "size_pt": None,
                "weight": "bold" if required_role == "h1" else "normal",
                "color_hex": "#000000",
                "inferred": True,
            }

    visual_spec.setdefault("color_palette", {"background": "#FFFFFF"})
    visual_spec.setdefault("bullet_style", {"level_1": "•", "level_2": "–", "indent_pt": 18.0})
    visual_spec.setdefault("paragraph_rules", {"first_line_indent_pt": 0.0, "space_between_paragraphs_pt": 6.0})

    return visual_spec


def _validate_content_spec(content_spec: dict) -> dict:
    """Ensure sections list is non-empty."""
    if not content_spec.get("sections"):
        logger.warning("Blueprint assembler: content_spec has no sections — adding placeholder")
        content_spec["sections"] = [{
            "section_id": "s1",
            "title": "Document",
            "depth": 1,
            "intent": "content",
            "allowed_element_types": ["paragraph"],
            "rhetorical_pattern": "narrative",
            "micro_template": "Provide the main document content.",
            "typography_role": "h1",
            "child_sections": [],
        }]
    return content_spec


def assemble_blueprint(
    golden_example_id: str,
    document_type: str,
    content_spec: dict,
    layout_spec: dict,
    visual_spec: dict,
    idm: dict,
) -> dict:
    """
    Stage E entry point. Assembles and validates the final JSON Blueprint.

    Args:
        golden_example_id:  UUID of the golden_examples DB record.
        document_type:      e.g. "role_specification".
        content_spec:       Output of Stage B (semantic analyzer).
        layout_spec:        Output of Stage C (layout analyzer).
        visual_spec:        Output of Stage D (visual style analyzer).
        idm:                The Intermediate Document Model (used for confidence flagging).

    Returns:
        Complete blueprint dict ready for storage in golden_examples.blueprint.
    """
    # Validate and fill each spec
    content_spec = _validate_content_spec(content_spec)
    layout_spec = _validate_layout_spec(layout_spec)
    visual_spec = _validate_visual_spec(visual_spec)

    # Flag low-confidence tokens
    visual_spec = _flag_low_occurrence_tokens(visual_spec, idm)

    # Cross-reference: bind sections ↔ layout order, add typography_role per section
    content_spec, layout_spec = _bind_sections_to_layout(content_spec, layout_spec)

    blueprint = {
        "blueprint_id": str(uuid.uuid4()),
        "golden_example_id": golden_example_id,
        "document_type": document_type,
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "content_structure_spec": content_spec,
        "layout_spec": layout_spec,
        "visual_style_spec": visual_spec,
    }

    logger.info(
        f"Blueprint assembled: {len(content_spec.get('sections', []))} sections, "
        f"column={layout_spec.get('column_structure')}, "
        f"typography roles={list(visual_spec.get('typography', {}).keys())}"
    )

    return blueprint
