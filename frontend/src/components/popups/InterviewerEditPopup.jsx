import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { XMarkIcon, UserCircleIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function InterviewerEditPopup({ interviewer, onClose, onSave, onDelete }) {
  const popupRef = useRef(null);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isEditProfile, setIsEditProfile] = useState(false);

  useEffect(() => {
    if (interviewer) {
      setName(interviewer.name || '');
      setPosition(interviewer.position || '');
      setCompany(interviewer.company || '');
      setEmail(interviewer.email || '');
      setPhone(interviewer.phone || '');
      setPreviewUrl(interviewer.photoUrl || '/images/default-pfp.webp');
    } else {
      setName('');
      setPosition('');
      setCompany('');
      setEmail('');
      setPhone('');
      setPreviewUrl('/images/default-pfp.webp');
    }
  }, [interviewer]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    try {
      setIsSubmitting(true);
      setError('');
      const formData = {
        name: name.trim(),
        position: position.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        profilePhoto
      };
      await onSave(formData);
      setIsEditProfile(false);
    } catch (err) {
      setError('Failed to save interviewer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={popupRef} className="bg-[#F0F7FF] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Combined Header with Profile Information */}
        <div className="flex items-start p-6">
          <div className="relative mr-6">
            <div className="w-24 h-24 rounded-full overflow-hidden">
              <Image
                src={previewUrl || '/images/default-pfp.webp'}
                alt={name || 'Interviewer'}
                width={96}
                height={96}
                style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
                className="rounded-full"
                onError={(e) => { e.target.src = '/images/default-pfp.webp'; }}
              />
            </div>
            {isEditProfile && (
              <label className="absolute bottom-0 right-0 bg-gray-100 rounded-full p-2 cursor-pointer hover:bg-gray-200 border border-white">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*"
                />
                <UserCircleIcon className="w-5 h-5 text-gray-700" />
              </label>
            )}
          </div>
          <div className="flex-1">
            {!isEditProfile && (
              <div>
                <div className="flex justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{name}</h2>
                    <p className="text-gray-600 text-lg">{position}</p>
                    <p className="text-blue-600 font-medium mb-2">{company}</p>
                    {email && (
                      <p className="text-gray-600 text-sm mb-1">
                        <span className="font-medium">Email:</span> {email}
                      </p>
                    )}
                    {phone && (
                      <p className="text-gray-600 text-sm">
                        <span className="font-medium">Phone:</span> {phone}
                      </p>
                    )}
                  </div>
                  <div className="flex">
                    <button
                      onClick={() => setIsEditProfile(true)}
                      className="p-2 rounded-full hover:bg-gray-200 h-10 mr-2"
                    >
                      <PencilIcon className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-full hover:bg-gray-200 h-10"
                    >
                      <XMarkIcon className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            {isEditProfile && (
              <div>
                <div className="flex justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Edit Interviewer Profile</h2>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-gray-200"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="p-0 bg-[#F0F7FF]">
          {isEditProfile ? (
            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="mb-4">
                  <label htmlFor="name" className="block text-gray-700 mb-2">Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="position" className="block text-gray-700 mb-2">Position</label>
                  <input
                    id="position"
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter position"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="company" className="block text-gray-700 mb-2">Company</label>
                  <input
                    id="company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter company"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-gray-700 mb-2">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="phone" className="block text-gray-700 mb-2">Phone</label>
                  <input
                    id="phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6 mb-4">
                <button
                  type="button"
                  onClick={() => setIsEditProfile(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-purple hover:bg-brand-purple-dark text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  )}
                  {isSubmitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          ) : null}

          {/* Footer */}
          <div className="flex justify-between items-center px-6 pb-6 mt-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(interviewer?.id)}
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
    </div>
  );
}
