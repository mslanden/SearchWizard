/**
 * useDocumentGenerationV3.js — Document generation hook for the Project Brain V3 pipeline.
 *
 * Replaces useDocumentGeneration.js. Key differences:
 *  - Only shows golden examples with a V3 blueprint (blueprint != null, status='ready')
 *  - Supports optional candidate and interviewer targeting
 *  - Calls POST /api/generate-document/v3 (Project Brain endpoint)
 *  - preview_only mode: returns assembled prompt without calling Claude
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { artifactApi } from '../lib/api';

const DEFAULT_BACKEND_URL = 'https://searchwizard-production.up.railway.app';

function getBackendUrl() {
  let url = process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL;
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
}

export default function useDocumentGenerationV3(projectId) {
  const { user } = useAuth();

  // Template selection (V3 only — blueprint must be present)
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // People selection (optional — for candidate/interviewer-specific documents)
  const [candidates, setCandidates] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedInterviewerId, setSelectedInterviewerId] = useState('');

  const [userComment, setUserComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Prompt preview data (set when preview_only=true is called)
  const [previewData, setPreviewData] = useState(null);

  const [localProjectId, setLocalProjectId] = useState(projectId);

  useEffect(() => {
    if (projectId) setLocalProjectId(projectId);
  }, [projectId]);

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (localProjectId) {
      fetchProjectPeople(localProjectId);
    }
  }, [localProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Template Fetching ───────────────────────────────────────────────────

  const fetchTemplates = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${getBackendUrl()}/api/templates?user_id=${user.id}`
      );
      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      const all = data.templates || [];

      // V3 only: must have a blueprint (V2 templates without blueprint are excluded)
      const v3Templates = all.filter(
        (t) => t.status === 'ready' && t.blueprint != null
      );

      setTemplates(v3Templates);
      setSelectedTemplate(v3Templates[0] || null);
    } catch (err) {
      setError(`Failed to load templates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── People Fetching (for optional candidate/interviewer selection) ───────

  const fetchProjectPeople = async (pid) => {
    try {
      const [candResp, intResp] = await Promise.all([
        supabase.from('candidates').select('id, name, role').eq('project_id', pid).order('name'),
        supabase.from('interviewers').select('id, name, position').eq('project_id', pid).order('name'),
      ]);
      setCandidates(candResp.data || []);
      setInterviewers(intResp.data || []);
    } catch (err) {
      console.warn('Failed to fetch project people:', err);
    }
  };

  // ─── Core API call ────────────────────────────────────────────────────────

  const callGenerateV3 = async (previewOnly = false) => {
    if (!selectedTemplate) throw new Error('No template selected');
    if (!localProjectId) throw new Error('No project ID');

    const payload = {
      template_id: selectedTemplate.id,
      project_id: localProjectId.toString(),
      user_id: user.id,
      user_requirements: userComment || '',
      candidate_id: selectedCandidateId || null,
      interviewer_id: selectedInterviewerId || null,
      preview_only: previewOnly,
    };

    const response = await fetch(`${getBackendUrl()}/api/generate-document/v3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let detail = errorText;
      try {
        detail = JSON.parse(errorText).detail || errorText;
      } catch (_) { /* use raw text */ }
      throw new Error(`API error ${response.status}: ${detail}`);
    }

    return response.json();
  };

  // ─── Save HTML to Supabase ────────────────────────────────────────────────

  const saveHtmlToSupabase = async (htmlContent) => {
    const templateName = selectedTemplate?.name || 'Document';
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    const file = new File(
      [htmlBlob],
      `${templateName.replace(/\s+/g, '_')}_${Date.now()}.html`,
      { type: 'text/html' }
    );

    const outputData = {
      name: `${templateName} Document`,
      description: `Generated via Project Brain V3`,
      output_type: 'html_document',
    };

    return artifactApi.addProjectOutput(localProjectId, outputData, file);
  };

  // ─── Public Actions ───────────────────────────────────────────────────────

  /** Generate document directly without showing prompt preview. */
  const handleGenerateMagic = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await callGenerateV3(false);
      await saveHtmlToSupabase(result.html_content);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'An error occurred during generation');
      setLoading(false);
      return false;
    }
  };

  /** Call Brain in preview_only mode — sets previewData without generating the document. */
  const handlePreviewPrompt = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await callGenerateV3(true);
      setPreviewData({
        prompt: result.prompt,
        selected_artifacts: result.selected_artifacts || [],
      });
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to assemble prompt preview');
      setLoading(false);
      return false;
    }
  };

  /** Generate document from the preview modal (same params, preview_only=false). */
  const handleGenerateFromPreview = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await callGenerateV3(false);
      await saveHtmlToSupabase(result.html_content);
      setPreviewData(null);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'An error occurred during generation');
      setLoading(false);
      return false;
    }
  };

  return {
    // Templates
    templates,
    selectedTemplate,
    setSelectedTemplate,
    fetchTemplates,
    // People selection
    candidates,
    interviewers,
    selectedCandidateId,
    setSelectedCandidateId,
    selectedInterviewerId,
    setSelectedInterviewerId,
    // User input
    userComment,
    setUserComment,
    // State
    loading,
    error,
    // Preview
    previewData,
    setPreviewData,
    // Actions
    handleGenerateMagic,
    handlePreviewPrompt,
    handleGenerateFromPreview,
  };
}
