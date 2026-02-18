import { useRef } from 'react';
import useCandidateEdit from '../../hooks/useCandidateEdit';
import CandidateProfileDisplay from '../candidate/CandidateProfileDisplay';
import CandidateProfileForm from '../candidate/CandidateProfileForm';
import CandidateArtifactsTable from '../candidate/CandidateArtifactsTable';
import EnhancedCandidateArtifactUploadPopup from './EnhancedCandidateArtifactUploadPopup';

export default function CandidateEditPopup({ candidate, onClose, onSave }) {
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
    handleChangeArtifactType
  } = useCandidateEdit(candidate);

  const onSubmit = (e) => handleProfileSubmit(e, onSave);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#F0F7FF] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
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

        {/* Artifacts Section */}
        <div className="p-0 bg-[#F0F7FF]">
          <CandidateArtifactsTable
            artifacts={artifacts}
            artifactTypes={artifactTypes}
            isLoadingArtifacts={isLoadingArtifacts}
            onUploadArtifact={handleUploadArtifact}
            onChangeArtifactType={handleChangeArtifactType}
          />

          {/* Close Button */}
          <div className="flex justify-end space-x-3 mt-0 px-6 pb-6">
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
        <EnhancedCandidateArtifactUploadPopup
          candidateId={candidate.id}
          candidateName={name}
          onClose={() => setShowUploadPopup(false)}
          onSuccess={handleArtifactUploaded}
        />
      )}
    </div>
  );
}