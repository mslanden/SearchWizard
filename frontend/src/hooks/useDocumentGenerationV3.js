/**
 * useDocumentGenerationV3.js — Document generation hook for the Project Brain V3 pipeline.
 *
 * Replaces useDocumentGeneration.js. Key differences:
 *  - Only shows golden examples with a V3 blueprint (blueprint != null, status='ready')
 *  - Supports optional candidate and interviewer targeting
 *  - Calls POST /api/generate-document/v3 (Project Brain endpoint) — returns 202 + job_id
 *  - Polls GET /api/generate-document/{job_id}/status every 4s until ready
 *  - preview_only mode: returns assembled prompt without calling Claude (still synchronous)
 *  - Accepts onOutputGenerated callback — called with the saved ProjectOutput on completion
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { storageApi } from '../lib/api';

const DEFAULT_BACKEND_URL = 'https://searchwizard-production.up.railway.app';
const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 75; // ~5 minutes

function getBackendUrl() {
  let url = process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL;
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
}

// Converts a slug like "role_specification" → "Role Specification" as a fallback
// when the artifact_types DB lookup doesn't have an entry for the slug.
function formatTypeSlug(slug) {
  if (!slug) return '';
  return slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function useDocumentGenerationV3(projectId, { onOutputGenerated } = {}) {
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
  const [documentName, setDocumentName] = useState('(New Document)');
  const [loading, setLoading] = useState(true); // true on mount so spinner shows immediately
  const [isGenerating, setIsGenerating] = useState(false); // true while background job is polling
  const [error, setError] = useState(null);

  // Prompt preview data (set when preview_only=true is called)
  const [previewData, setPreviewData] = useState(null);

  const [localProjectId, setLocalProjectId] = useState(projectId);
  const pollIntervalRef = useRef(null);

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

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // ─── Template Fetching ───────────────────────────────────────────────────

  const fetchTemplates = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const [response, goldenTypes] = await Promise.all([
        fetch(`${getBackendUrl()}/api/templates?user_id=${user.id}`),
        storageApi.getArtifactTypes('golden'),
      ]);
      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      const all = data.templates || [];

      // V3 only: must have a blueprint (V2 templates without blueprint are excluded)
      const v3Templates = all.filter(
        (t) => t.status === 'ready' && t.blueprint != null
      );

      // Attach a user-friendly typeLabel to each template for display in the dropdown
      const typeMap = Object.fromEntries((goldenTypes || []).map(t => [t.id, t.name]));
      const labeled = v3Templates.map(t => ({
        ...t,
        typeLabel: typeMap[t.document_type] || formatTypeSlug(t.document_type) || t.name,
      }));

      setTemplates(labeled);
      setSelectedTemplate(labeled[0] || null);
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
      document_name: documentName,
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

  // ─── Polling ──────────────────────────────────────────────────────────────

  const startPolling = (jobId) => {
    let attempts = 0;

    pollIntervalRef.current = setInterval(async () => {
      attempts++;

      if (attempts > POLL_MAX_ATTEMPTS) {
        clearInterval(pollIntervalRef.current);
        setIsGenerating(false);
        setError('Generation timed out. Please try again.');
        return;
      }

      try {
        const res = await fetch(
          `${getBackendUrl()}/api/generate-document/${jobId}/status`
        );
        if (!res.ok) return; // silent skip — continue polling

        const data = await res.json();

        if (data.status === 'ready') {
          clearInterval(pollIntervalRef.current);
          if (data.output && onOutputGenerated) {
            onOutputGenerated({
              ...data.output,
              dateCreated: new Date(data.output.dateCreated).toLocaleString(),
            });
          }
          setIsGenerating(false);
        } else if (data.status === 'error') {
          clearInterval(pollIntervalRef.current);
          setError(data.error || 'An error occurred during generation');
          setIsGenerating(false);
        }
        // status='processing' → continue polling
      } catch (err) {
        console.error('Poll error:', err);
        // Network hiccup — continue polling silently
      }
    }, POLL_INTERVAL_MS);
  };

  // ─── Public Actions ───────────────────────────────────────────────────────

  /** Submit generation job; popup transitions to floating card immediately. */
  const handleGenerateMagic = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsGenerating(true); // transition to floating card before awaiting API
      const result = await callGenerateV3(false);
      setLoading(false);
      startPolling(result.job_id);
      return true;
    } catch (err) {
      setIsGenerating(false); // revert on error so full modal is shown again
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
      setIsGenerating(true); // transition to floating card before awaiting API
      const result = await callGenerateV3(false);
      setPreviewData(null);
      setLoading(false);
      startPolling(result.job_id);
      return true;
    } catch (err) {
      setIsGenerating(false); // revert on error
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
    documentName,
    setDocumentName,
    // State
    loading,
    isGenerating,
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
