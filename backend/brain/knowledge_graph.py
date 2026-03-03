"""
brain/knowledge_graph.py — Lightweight entity context via Supabase FK traversal.

Implements Option B from ADR-012: entity relationships are modelled as Supabase
FK relationships and traversed via direct queries (JOIN equivalent). No graph DB
required at current scale.

Graph model:
  projects → artifacts (company + role)
  projects → candidates → candidate_artifacts
  projects → interviewers → process_artifacts

Future: extend to Candidate → Role → Competency multi-hop when those
relationships are formally modelled in the DB schema.
"""


async def get_entity_context(
    supabase,
    project_id: str,
    candidate_id: str | None = None,
    interviewer_id: str | None = None,
) -> dict:
    """
    Build entity context dict from direct FK lookups.

    Returns:
        {
            project: {id, title, client, description, date},
            candidate: {id, name, role, company, email} | None,
            interviewer: {id, name, position, company} | None,
        }
    """
    context = {
        'project': {},
        'candidate': None,
        'interviewer': None,
    }

    # Project
    try:
        proj_resp = supabase.table('projects').select(
            'id, title, client, description, date'
        ).eq('id', project_id).single().execute()
        context['project'] = proj_resp.data or {}
    except Exception as e:
        print(f"[brain/knowledge_graph] Failed to fetch project: {e}")

    # Candidate (if targeted)
    if candidate_id:
        try:
            cand_resp = supabase.table('candidates').select(
                'id, name, role, company, email'
            ).eq('id', candidate_id).single().execute()
            context['candidate'] = cand_resp.data or {}
        except Exception as e:
            print(f"[brain/knowledge_graph] Failed to fetch candidate: {e}")

    # Interviewer (if targeted)
    if interviewer_id:
        try:
            int_resp = supabase.table('interviewers').select(
                'id, name, position, company'
            ).eq('id', interviewer_id).single().execute()
            context['interviewer'] = int_resp.data or {}
        except Exception as e:
            print(f"[brain/knowledge_graph] Failed to fetch interviewer: {e}")

    return context
