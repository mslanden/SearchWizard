import { useRef } from 'react';
import useCandidateEdit from '../../hooks/useCandidateEdit';
import CandidateProfileDisplay from '../candidate/CandidateProfileDisplay';
import CandidateProfileForm from '../candidate/CandidateProfileForm';

export default function CandidateEditPopup({ candidate, onClose, onSave, onDelete }) {
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
    error,
    isEditProfile, setIsEditProfile,

    // Methods
    handlePhotoChange,
    handleProfileSubmit,
  } = useCandidateEdit(candidate);

  const onSubmit = (e) => handleProfileSubmit(e, onSave);

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
    </div>
  );
}
