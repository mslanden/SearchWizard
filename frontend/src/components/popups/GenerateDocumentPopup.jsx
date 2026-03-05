"use client";
import { useRef } from 'react';
import { XMarkIcon, SparklesIcon, EyeIcon } from '@heroicons/react/24/outline';
import useDocumentGenerationV3 from '../../hooks/useDocumentGenerationV3';
import PromptPreviewModal from '../PromptPreviewModal';

/** @param {{ onClose: () => void, projectId?: string | null, onOutputGenerated?: function }} props */
export default function GenerateDocumentPopup({ onClose, projectId = null, onOutputGenerated }) {
  const popupRef = useRef(null);
  const {
    templates,
    selectedTemplate,
    setSelectedTemplate,
    candidates,
    interviewers,
    selectedCandidateId,
    setSelectedCandidateId,
    selectedInterviewerId,
    setSelectedInterviewerId,
    userComment,
    setUserComment,
    documentName,
    setDocumentName,
    loading,
    isGenerating,
    error,
    previewData,
    setPreviewData,
    handleGenerateMagic,
    handlePreviewPrompt,
    handleGenerateFromPreview,
  } = useDocumentGenerationV3(projectId, { onOutputGenerated });

  const onGenerateMagic = async () => {
    await handleGenerateMagic();
    // Popup stays open in isGenerating state — does NOT auto-close
  };

  const onPreviewPrompt = async () => {
    await handlePreviewPrompt();
  };

  const onGenerateFromPreview = async () => {
    await handleGenerateFromPreview();
    // Popup stays open in isGenerating state
  };

  const noTemplates = templates.length === 0 && !loading;

  // ─── Generating state: floating non-blocking card ─────────────────────────

  if (isGenerating) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-white rounded-xl shadow-2xl border border-purple-200 p-5 w-80">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              Generating &ldquo;{documentName}&rdquo;&hellip;
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              You can continue working below.
            </p>
            {error && (
              <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            title="Dismiss"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 pl-9">(Keep open for live updates)</p>
      </div>
    );
  }

  // ─── Normal modal state ───────────────────────────────────────────────────

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40"
        onClick={onClose}
      >
        <div
          ref={popupRef}
          className="rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-[#E6F0FF]"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div style={{ color: '#8B5CF6' }}>
                  <SparklesIcon className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-bold" style={{ color: '#8B5CF6' }}>
                  Generate New Document
                </h2>
              </div>
              <button className="p-1 rounded-full hover:bg-gray-100" onClick={onClose}>
                <XMarkIcon className="w-6 h-6 text-gray-700" />
              </button>
            </div>

            {/* No V3 templates warning */}
            {noTemplates && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                No V3 templates available. Please upload a golden example via the Golden Examples
                popup to create a blueprint-powered template.
              </div>
            )}

            <div className="space-y-6">
              {/* Document Name */}
              <div className="flex items-center justify-between">
                <label className="text-xl text-gray-700 font-medium">Document Name:</label>
                <div className="w-1/2">
                  <input
                    type="text"
                    value={documentName}
                    onChange={e => setDocumentName(e.target.value)}
                    disabled={loading}
                    placeholder="(New Document)"
                    className="block w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Template selector */}
              <div className="flex items-center justify-between">
                <label className="text-xl text-gray-700 font-medium">Select Template:</label>
                <div className="w-1/2">
                  <select
                    value={selectedTemplate?.id || ''}
                    onChange={e =>
                      setSelectedTemplate(templates.find(t => t.id === e.target.value) || null)
                    }
                    disabled={loading || noTemplates}
                    className="block w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.typeLabel}{t.name && t.name !== t.typeLabel ? ` — ${t.name}` : ''}
                      </option>
                    ))}
                    {noTemplates && <option value="">— No templates available —</option>}
                  </select>
                </div>
              </div>

              {/* Candidate selector (optional — only shown when project has candidates) */}
              {candidates.length > 0 && (
                <div className="flex items-center justify-between">
                  <label className="text-xl text-gray-700 font-medium">Candidate (optional):</label>
                  <div className="w-1/2">
                    <select
                      value={selectedCandidateId}
                      onChange={e => setSelectedCandidateId(e.target.value)}
                      disabled={loading}
                      className="block w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">None — project-level document</option>
                      {candidates.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.role ? ` (${c.role})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Interviewer selector (optional — only shown when project has interviewers) */}
              {interviewers.length > 0 && (
                <div className="flex items-center justify-between">
                  <label className="text-xl text-gray-700 font-medium">Interviewer (optional):</label>
                  <div className="w-1/2">
                    <select
                      value={selectedInterviewerId}
                      onChange={e => setSelectedInterviewerId(e.target.value)}
                      disabled={loading}
                      className="block w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">None</option>
                      {interviewers.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name}{i.position ? ` (${i.position})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* User comments */}
              <div>
                <label className="block text-xl text-gray-700 font-medium mb-2">
                  Additional Requirements:
                </label>
                <textarea
                  value={userComment}
                  onChange={e => setUserComment(e.target.value)}
                  disabled={loading}
                  placeholder="Add any specific requirements or notes for this document..."
                  rows={4}
                  className="block w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onPreviewPrompt}
                  disabled={loading || noTemplates}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-purple-400 text-purple-700 bg-white hover:bg-purple-50 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <EyeIcon className="w-5 h-5" />
                  {loading ? 'Assembling...' : 'Preview Prompt'}
                </button>
                <button
                  onClick={onGenerateMagic}
                  disabled={loading || noTemplates}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: loading ? '#9CA3AF' : '#8B5CF6' }}
                >
                  <SparklesIcon className="w-5 h-5" />
                  {loading ? 'Starting...' : 'Generate by Magic'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Preview Modal */}
      <PromptPreviewModal
        isOpen={previewData != null}
        onClose={() => setPreviewData(null)}
        promptData={previewData}
        onGenerate={onGenerateFromPreview}
        loading={loading}
      />
    </>
  );
}
