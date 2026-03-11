"""
brain/prompt_builder.py — Assemble the final generation prompt from blueprint + ranked artifacts.

Prompt order:
  1. Persona + INSTRUCTION (top)
  2. DOCUMENT BLUEPRINT (full, unsummarized: content structure, layout, visual style guidance)
  3. ENTITY CONTEXT
  4. SECTION CONTENT GUIDANCE (artifact content per section, up to 50k chars each)
  5. USER REQUIREMENTS (if provided)
"""

MAX_ARTIFACT_CONTENT_CHARS = 50_000  # chars per artifact in the prompt
MAX_ARTIFACTS_PER_SECTION = 3        # max artifacts shown per section

_PERSONA_AND_INSTRUCTION = """\
You are an exceptional Executive Search consultant, widely regarded as the premier talent at your top-tier firm. Your extraordinary ability to match the right leader with the right organization at the right time has made you the most trusted advisor to boards and CEOs seeking transformational leadership. Your writing is elegant yet accessible, combining rigorous analysis with narrative storytelling. Accuracy is paramount, while still managing to make your work compelling and engaging.

## INSTRUCTION
Use the document blueprint below as the prototype structure to generate a similarly complete, professional HTML document that:
- Follows the document structure, section order, and rhetorical patterns defined in the blueprint
- Appropriately substitutes the facts and content from the provided artifacts accurately and faithfully — it is essential that key points from the artifacts are captured as noted, without adding new information not present in the source material
- Mirrors the visual style (fonts, colours, spacing, layout) described in the Visual Style Guidance
- Is well-formatted, uses appropriate HTML tags including a full <style> block, and is ready to render in a browser
- Remember: the document blueprint's content is for example only. Use the facts and content from the artifacts to accurately follow the structure defined by the blueprint.

Return only the HTML. Do not include explanations or markdown code fences.\
"""


def build_generation_prompt(
    blueprint: dict,
    ranked_artifacts: dict,
    entity_context: dict,
    visual_style_guidance: str,
    user_requirements: str,
) -> str:
    """
    Assemble the complete generation prompt for Claude.

    ranked_artifacts: output of rank_artifacts_for_blueprint()
    entity_context: output of get_entity_context()
    visual_style_guidance: natural-language style description from blueprint
    """
    parts: list[str] = []

    # 1. Persona + instruction
    parts.append(_PERSONA_AND_INSTRUCTION)

    # 2. Full document blueprint
    parts.append("\n---\n\n## DOCUMENT BLUEPRINT")
    parts.append(_format_full_blueprint(blueprint, visual_style_guidance))

    # 3. Entity context
    parts.append("\n---\n\n## ENTITY CONTEXT")
    parts.append(_format_entity_context(entity_context))

    # 4. Section-by-section artifact content
    by_section = ranked_artifacts.get('by_section', {})
    sections = blueprint.get('content_structure_spec', {}).get('sections', [])

    if sections and by_section:
        parts.append(
            "\n---\n\n## SECTION CONTENT GUIDANCE\n"
            "The following source material has been matched to each section of the document. "
            "Use it as the factual foundation — incorporate key points accurately and do not "
            "introduce facts not present here."
        )
        for section in sections:
            sid = section.get('section_id', '')
            title = section.get('title', sid)
            intent = section.get('intent', '')
            rhetorical = section.get('rhetorical_pattern', '')
            matches = by_section.get(sid, [])

            header = f"\n### {title} ({sid})"
            if intent:
                header += f"\nIntent: {intent}"
            if rhetorical:
                header += f"\nPattern: {rhetorical}"
            parts.append(header)

            if not matches:
                parts.append("_No specific artifacts matched this section._")
                continue

            for match in matches[:MAX_ARTIFACTS_PER_SECTION]:
                art = match['artifact']
                content = (art.get('processed_content') or '').strip()
                if not content:
                    content = f"[{art.get('artifact_type', 'artifact')} — no text content available]"
                else:
                    content = content[:MAX_ARTIFACT_CONTENT_CHARS]
                entity_label = _entity_label(art)
                parts.append(f"\n**{art.get('name', 'Artifact')}** ({entity_label}):\n{content}")
    else:
        # No blueprint sections — include globally ranked artifacts as flat context
        parts.append("\n---\n\n## ARTIFACT CONTEXT")
        for item in ranked_artifacts.get('global', [])[:10]:
            art = item['artifact']
            content = (art.get('processed_content') or '').strip()[:MAX_ARTIFACT_CONTENT_CHARS]
            entity_label = _entity_label(art)
            if content:
                parts.append(f"\n**{art.get('name', 'Artifact')}** ({entity_label}):\n{content}")

    # 5. User requirements
    if user_requirements and user_requirements.strip():
        parts.append(f"\n---\n\n## USER REQUIREMENTS\n{user_requirements.strip()}")

    return '\n'.join(parts)


def _format_full_blueprint(blueprint: dict, visual_style_guidance: str) -> str:
    """
    Render the complete blueprint — content structure, layout, and visual style —
    as a readable, unsummarized block for the generation prompt.
    """
    lines: list[str] = []

    document_type = blueprint.get('document_type', '')
    if document_type:
        lines.append(f"Document type: {document_type}\n")

    # Content structure — all section fields
    sections = blueprint.get('content_structure_spec', {}).get('sections', [])
    if sections:
        lines.append(f"### Content Structure ({len(sections)} sections)\n")
        _append_sections(lines, sections, indent=0)

    # Layout specification — all fields
    layout = blueprint.get('layout_spec', {})
    if layout:
        lines.append("\n### Layout Specification")
        lines.append(f"- Page size: {layout.get('page_size', 'A4')}")
        lines.append(f"- Column structure: {layout.get('column_structure', 'single')}")
        margins = layout.get('margins_pt', {})
        if margins:
            lines.append(
                f"- Margins: top {margins.get('top', 72)}pt / bottom {margins.get('bottom', 72)}pt"
                f" / left {margins.get('left', 72)}pt / right {margins.get('right', 72)}pt"
            )
        section_order = layout.get('section_order', [])
        if section_order:
            lines.append(f"- Section order: {', '.join(section_order)}")
        spacing = layout.get('spacing_rules', {})
        if spacing:
            lines.append(
                f"- Spacing: H1 {spacing.get('before_h1_pt', 24)}pt before / "
                f"{spacing.get('after_h1_pt', 12)}pt after · "
                f"H2 {spacing.get('before_h2_pt', 18)}pt before / "
                f"{spacing.get('after_h2_pt', 8)}pt after · "
                f"paragraph gap {spacing.get('paragraph_spacing_pt', 6)}pt · "
                f"line height {spacing.get('line_spacing_multiple', 1.15)}×"
            )
        header_rule = layout.get('header_rule', {})
        if header_rule.get('present'):
            lines.append(f"- Header: present — {header_rule.get('content_pattern', '')}")
        else:
            lines.append("- Header: absent")
        footer_rule = layout.get('footer_rule', {})
        if footer_rule.get('present'):
            lines.append(f"- Footer: present — {footer_rule.get('content_pattern', '')}")
        else:
            lines.append("- Footer: absent")
        lines.append(f"- Table placement: {layout.get('table_placement', 'inline')}")
        lines.append(f"- Image placement: {layout.get('image_placement', 'inline')}")

    # Visual style — natural-language guidance
    lines.append("\n### Visual Style Guidance")
    if visual_style_guidance:
        lines.append(visual_style_guidance)
    else:
        lines.append("No visual style guidance available.")

    return '\n'.join(lines)


def _append_sections(lines: list, sections: list, indent: int) -> None:
    """Recursively format sections with all fields."""
    prefix = "  " * indent
    for s in sections:
        sid = s.get('section_id', '')
        title = s.get('title', sid)
        lines.append(f"\n{prefix}**{title}** (section_id: {sid})")
        if s.get('typography_role'):
            lines.append(f"{prefix}- Typography role: {s['typography_role']}")
        if s.get('rhetorical_pattern'):
            lines.append(f"{prefix}- Rhetorical pattern: {s['rhetorical_pattern']}")
        if s.get('intent'):
            lines.append(f"{prefix}- Intent: {s['intent']}")
        allowed = s.get('allowed_element_types', [])
        if allowed:
            lines.append(f"{prefix}- Allowed elements: {', '.join(allowed)}")
        if s.get('micro_template'):
            lines.append(f"{prefix}- Micro-template: {s['micro_template']}")
        children = s.get('child_sections', [])
        if children:
            _append_sections(lines, children, indent + 1)


def _format_entity_context(entity_context: dict) -> str:
    """Format project/candidate/interviewer context for the prompt."""
    lines = []
    project = entity_context.get('project', {})
    if project:
        lines.append(f"Project: {project.get('title', 'N/A')}")
        if project.get('client'):
            lines.append(f"Client: {project['client']}")
        if project.get('description'):
            lines.append(f"Description: {project['description']}")

    candidate = entity_context.get('candidate')
    if candidate:
        lines.append(f"\nCandidate: {candidate.get('name', 'N/A')}")
        if candidate.get('role'):
            lines.append(f"Role: {candidate['role']}")
        if candidate.get('company'):
            lines.append(f"Company: {candidate['company']}")
        if candidate.get('email'):
            lines.append(f"Email: {candidate['email']}")

    interviewer = entity_context.get('interviewer')
    if interviewer:
        lines.append(f"\nInterviewer: {interviewer.get('name', 'N/A')}")
        if interviewer.get('position'):
            lines.append(f"Position: {interviewer['position']}")
        if interviewer.get('company'):
            lines.append(f"Company: {interviewer['company']}")

    return '\n'.join(lines) if lines else "No entity context available."


def _entity_label(artifact: dict) -> str:
    """Short human-readable label for an artifact's entity and type."""
    entity_type = artifact.get('entity_type', '')
    artifact_type = artifact.get('artifact_type', '')
    if entity_type and artifact_type:
        return f"{entity_type} · {artifact_type}"
    return entity_type or artifact_type or 'artifact'
