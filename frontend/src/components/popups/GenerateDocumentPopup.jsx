"use client";
import { useRef } from 'react';
import { XMarkIcon, SparklesIcon, EyeIcon } from '@heroicons/react/24/outline';
import useDocumentGenerationV3 from '../../hooks/useDocumentGenerationV3';
import PromptPreviewModal from '../PromptPreviewModal';

/** @param {{ onClose: () => void, projectId?: string | null }} props */
export default function GenerateDocumentPopup({ onClose, projectId = null }) {
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
    loading,
    error,
    previewData,
    setPreviewData,
    handleGenerateMagic,
    handlePreviewPrompt,
    handleGenerateFromPreview,
  } = useDocumentGenerationV3(projectId);

  const onGenerateMagic = async () => {
    const success = await handleGenerateMagic();
    if (success) {
      onClose();
    }
  };

  const onPreviewPrompt = async () => {
    await handlePreviewPrompt();
    // previewData is set by the hook — PromptPreviewModal renders when previewData != null
  };

  const onGenerateFromPreview = async () => {
    const success = await handleGenerateFromPreview();
    if (success) {
      onClose();
    }
  };

  const noTemplates = templates.length === 0 && !loading;

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
                        {t.name} ({t.document_type || 'document'})
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
                  {loading ? 'Generating...' : 'Generate by Magic'}
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
