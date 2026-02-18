import { useRef } from 'react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import useDocumentGeneration from '../../hooks/useDocumentGeneration';
import DocumentTypeSelector from '../document-generation/DocumentTypeSelector';
import UserCommentsSection from '../document-generation/UserCommentsSection';
import GenerationActions from '../document-generation/GenerationActions';

export default function GenerateDocumentPopup({ onClose, projectId = null }) {
  const popupRef = useRef(null);
  const {
    documentType,
    setDocumentType,
    loading,
    error,
    userComment,
    setUserComment,
    documentTypes,
    handleGenerate
  } = useDocumentGeneration(projectId);

  const onGenerate = async () => {
    const success = await handleGenerate();
    if (success) {
      onClose();
      alert(`${documentType} document generated successfully!`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40" onClick={onClose}>
      <div 
        ref={popupRef}
        className="rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-[#E6F0FF]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="" style={{ color: '#8B5CF6' }}>
                <SparklesIcon className="w-12 h-12" />
              </div>
              <h2 className="text-4xl font-bold" style={{ color: '#8B5CF6' }}>Generate New Document</h2>
            </div>
            <button 
              className="p-1 rounded-full hover:bg-gray-100"
              onClick={onClose}
            >
              <XMarkIcon className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <DocumentTypeSelector
              documentType={documentType}
              onDocumentTypeChange={setDocumentType}
              documentTypes={documentTypes}
              loading={loading}
            />

            <UserCommentsSection
              userComment={userComment}
              onUserCommentChange={setUserComment}
              loading={loading}
            />

            <GenerationActions
              onGenerate={onGenerate}
              loading={loading}
              error={error}
            />
          </div>
        </div>
      </div>
    </div>
  );
}