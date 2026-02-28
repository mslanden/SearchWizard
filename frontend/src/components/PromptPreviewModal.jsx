"use client";
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';

/**
 * PromptPreviewModal — Shows the Project Brain's assembled generation prompt
 * before it is sent to Claude.
 *
 * Opened by "Preview Prompt" in GenerateDocumentPopup.
 * User can review the prompt and the artifacts the Brain selected, then either
 * cancel or proceed to generate the document.
 *
 * Future: make the prompt textarea editable and pass a custom_prompt override
 * to /api/generate-document/v3.
 *
 * Props:
 *   isOpen        boolean
 *   onClose       () => void
 *   promptData    { prompt: string, selected_artifacts: ArtifactSummary[] } | null
 *   onGenerate    () => Promise<void>  — called when user clicks "Generate Document"
 *   loading       boolean
 */
export default function PromptPreviewModal({ isOpen, onClose, promptData, onGenerate, loading }) {
  if (!isOpen || !promptData) return null;

  const { prompt, selected_artifacts: selectedArtifacts = [] } = promptData;

  const handleGenerate = async () => {
    await onGenerate();
    // onGenerate calls onClose internally on success via the parent handler
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assembled Generation Prompt</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Assembled by Project Brain — review before sending to Claude
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Prompt */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Prompt</h3>
            {/* Read-only in V1. Future: make editable with a custom_prompt override. */}
            <textarea
              readOnly
              value={prompt}
              rows={14}
              className="w-full text-xs font-mono text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1 italic">
              Read-only view. Editing will be available in a future update.
            </p>
          </div>

          {/* Selected Artifacts */}
          {selectedArtifacts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Selected Artifacts ({selectedArtifacts.length})
              </h3>
              <ul className="space-y-1.5">
                {selectedArtifacts.map((a, i) => (
                  <li key={a.id || i} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="mt-0.5 inline-block w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                    <span>
                      <span className="font-medium text-gray-800">{a.name}</span>
                      {a.section_id && (
                        <span className="ml-1 text-gray-400">
                          → <span className="font-mono">{a.section_id}</span>
                        </span>
                      )}
                      {a.score != null && (
                        <span className="ml-1 text-gray-400">
                          ({a.score.toFixed ? a.score.toFixed(2) : a.score})
                        </span>
                      )}
                      {a.entity_type && a.entity_type !== 'project' && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                          {a.entity_type}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40 transition-colors"
            style={{ backgroundColor: loading ? '#9CA3AF' : '#8B5CF6' }}
          >
            <SparklesIcon className="w-4 h-4" />
            {loading ? 'Generating...' : 'Generate Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
