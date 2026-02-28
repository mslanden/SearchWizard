"""
brain/prompt_builder.py — Assemble the final generation prompt from blueprint + ranked artifacts.

The prompt is structured in distinct labeled sections so Claude can easily locate:
  1. Document structure and formatting intent (from blueprint)
  2. Section-by-section artifact content (the Brain's matched context)
  3. Entity context (project / candidate / interviewer profiles)
  4. Visual style requirements (from blueprint.visual_style_spec)
  5. User requirements (free-text from the user)
  6. Generation instruction
"""
import json

MAX_ARTIFACT_CONTENT_CHARS = 2000   # chars per artifact in the prompt
MAX_ARTIFACTS_PER_SECTION = 3       # max artifacts shown per section
MAX_VISUAL_SPEC_CHARS = 3000        # JSON chars for visual style block


def build_generation_prompt(
    blueprint: dict,
    ranked_artifacts: dict,
    entity_context: dict,
    visual_style_spec: dict,
    user_requirements: str,
) -> str:
    """
    Assemble the complete generation prompt for Claude.

    ranked_artifacts: output of rank_artifacts_for_blueprint()
    entity_context: output of get_entity_context()
    """
    parts: list[str] = []

    # 1. Document structure and formatting
    parts.append("## DOCUMENT STRUCTURE AND FORMATTING")
    parts.append(_format_blueprint_structure(blueprint))

    # 2. Section-by-section matched content
    by_section = ranked_artifacts.get('by_section', {})
    sections = blueprint.get('content_structure_spec', {}).get('sections', [])

    if sections and by_section:
        parts.append("\n## SECTION CONTENT GUIDANCE")
        parts.append(
            "The following context has been selected for each document section. "
            "Use it to ground the content of each section in real, accurate information."
        )
        for section in sections:
            sid = section.get('section_id', '')
            intent = section.get('intent', '')
            rhetorical = section.get('rhetorical_pattern', '')
            matches = by_section.get(sid, [])

            section_header = f"\n### {sid}"
            if intent:
                section_header += f"\n_Intent: {intent}_"
            if rhetorical:
                section_header += f"\n_Pattern: {rhetorical}_"
            parts.append(section_header)

            if not matches:
                parts.append("_No specific artifacts matched this section._")
                continue

            for match in matches[:MAX_ARTIFACTS_PER_SECTION]:
                art = match['artifact']
                content = (art.get('processed_content') or '').strip()
                if not content:
                    # Image or unsupported format — use metadata stub as signal
                    content = f"[{art.get('artifact_type', 'artifact')} — no text content available]"
                else:
                    content = content[:MAX_ARTIFACT_CONTENT_CHARS]
                entity_label = _entity_label(art)
                parts.append(f"\n**{art.get('name', 'Artifact')}** ({entity_label}):\n{content}")
    else:
        # No blueprint sections — include all globally ranked artifacts as flat context
        parts.append("\n## ARTIFACT CONTEXT")
        for item in ranked_artifacts.get('global', [])[:10]:
            art = item['artifact']
            content = (art.get('processed_content') or '').strip()[:MAX_ARTIFACT_CONTENT_CHARS]
            entity_label = _entity_label(art)
            if content:
                parts.append(f"\n**{art.get('name', 'Artifact')}** ({entity_label}):\n{content}")

    # 3. Entity context
    parts.append("\n## ENTITY CONTEXT")
    parts.append(_format_entity_context(entity_context))

    # 4. Visual style
    if visual_style_spec:
        visual_json = json.dumps(visual_style_spec, indent=2)[:MAX_VISUAL_SPEC_CHARS]
        parts.append("\n## VISUAL STYLE REQUIREMENTS")
        parts.append(visual_json)

    # 5. User requirements
    if user_requirements and user_requirements.strip():
        parts.append(f"\n## USER REQUIREMENTS\n{user_requirements.strip()}")

    # 6. Generation instruction
    parts.append(
        "\n## INSTRUCTION\n"
        "Generate a complete, professional HTML document that:\n"
        "- Follows the document structure and section order defined above\n"
        "- Incorporates the provided artifact content accurately and faithfully\n"
        "- Applies the visual style (fonts, colours, spacing) from the Visual Style Requirements\n"
        "- Is well-formatted, uses appropriate HTML tags, and is ready to render in a browser\n"
        "Return only the HTML. Do not include explanation or markdown code fences."
    )

    return '\n'.join(parts)


def _format_blueprint_structure(blueprint: dict) -> str:
    """Summarise the blueprint's structural intent for the prompt header."""
    lines = []
    document_type = blueprint.get('document_type', '')
    if document_type:
        lines.append(f"Document type: {document_type}")

    sections = blueprint.get('content_structure_spec', {}).get('sections', [])
    if sections:
        lines.append(f"Section structure ({len(sections)} sections):")
        for s in sections:
            sid = s.get('section_id', '')
            micro = s.get('micro_template', '')
            line = f"  • {sid}"
            if micro:
                line += f" — {micro}"
            lines.append(line)

    layout = blueprint.get('layout_spec', {})
    if layout.get('column_structure'):
        lines.append(f"Layout: {layout['column_structure']}")
    if layout.get('page_size'):
        lines.append(f"Page size: {layout['page_size']}")

    return '\n'.join(lines) if lines else "No structural specification available."


def _format_entity_context(entity_context: dict) -> str:
    """Format project/candidate/interviewer context for the prompt."""
    lines = []
    project = entity_context.get('project', {})
    if project:
        lines.append(f"Project: {project.get('title', 'N/A')}")
        if project.get('client'):
            lines.append(f"Client: {project['client']}")
        if project.get('description'):
            lines.append(f"Description: {project['description'][:500]}")

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
