import { useRef } from 'react';
import useCandidateEdit from '../../hooks/useCandidateEdit';
import CandidateProfileDisplay from '../candidate/CandidateProfileDisplay';
import CandidateProfileForm from '../candidate/CandidateProfileForm';
import CandidateArtifactsTable from '../candidate/CandidateArtifactsTable';
import EnhancedArtifactUploadPopup from './EnhancedArtifactUploadPopup';
import { candidateApi } from '../../lib/api';

export default function CandidateEditPopup({ candidate, onClose, onSave, onDelete, onArtifactAdded, onArtifactDeleted }) {
  const popupRef = useRef(null);
  const {
    // State
    name, setName,
    role, setRole,
    company, setCompany,
    email, setEmail,
    phone, setPhone,
    previewUrl,
    isSubmitting,
    error, setError,
    artifacts,
    isLoadingArtifacts,
    artifactTypes,
    isEditProfile, setIsEditProfile,
    showUploadPopup, setShowUploadPopup,

    // Methods
    handlePhotoChange,
    handleProfileSubmit,
    handleUploadArtifact,
    handleArtifactUploaded,
    handleChangeArtifactType,
  } = useCandidateEdit(candidate);

  const onSubmit = (e) => handleProfileSubmit(e, onSave);

  const handleCandidateArtifactUpload = async (uploadPayload) => {
    const artifactData = {
      name: uploadPayload.name,
      description: uploadPayload.description,
      artifactType: uploadPayload.artifactType,
      inputType: uploadPayload.inputType,
      ...(uploadPayload.inputType === 'url' ? { sourceUrl: uploadPayload.sourceUrl } : {}),
      ...(uploadPayload.inputType === 'text' ? { textContent: uploadPayload.textContent } : {}),
    };
    const result = await candidateApi.addCandidateArtifact(candidate.id, artifactData, uploadPayload.file || null);
    await handleArtifactUploaded(result);
    if (result && onArtifactAdded) onArtifactAdded(candidate.id);
    return result;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={popupRef} className="bg-[#F0F7FF] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

        {/* Profile Header/Form */}
        {!isEditProfile ? (
          <CandidateProfileDisplay
            candidate={{
              name,
              role,
              company,
              email,
              phone,
              photoUrl: previewUrl
            }}
            onEdit={() => setIsEditProfile(true)}
            onClose={onClose}
          />
        ) : (
          <CandidateProfileForm
            name={name}
            setName={setName}
            role={role}
            setRole={setRole}
            company={company}
            setCompany={setCompany}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            previewUrl={previewUrl}
            onPhotoChange={handlePhotoChange}
            onSubmit={onSubmit}
            onCancel={() => setIsEditProfile(false)}
            isSubmitting={isSubmitting}
            onClose={onClose}
          />
        )}

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Artifacts Section — only shown in display mode, not during profile edit */}
        {!isEditProfile && (
          <div className="p-0 bg-[#F0F7FF]">
            <CandidateArtifactsTable
              artifacts={artifacts}
              artifactTypes={artifactTypes}
              isLoadingArtifacts={isLoadingArtifacts}
              onUploadArtifact={handleUploadArtifact}
              onChangeArtifactType={handleChangeArtifactType}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center px-6 pb-6 mt-2">
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(candidate?.id)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
            >
              Delete Profile
            </button>
          )}
          <div className={`flex space-x-3 ${onDelete ? '' : 'ml-auto'}`}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Artifact Upload Popup */}
      {showUploadPopup && candidate && (
        <EnhancedArtifactUploadPopup
          type="candidate"
          onClose={() => setShowUploadPopup(false)}
          onUpload={handleCandidateArtifactUpload}
        />
      )}
    </div>
  );
}
