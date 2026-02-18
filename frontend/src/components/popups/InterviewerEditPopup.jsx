import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { XMarkIcon, UserCircleIcon, DocumentIcon, LinkIcon, DocumentTextIcon, PlusIcon, PencilIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { artifactApi } from '../../lib/api';
import EnhancedProcessArtifactUploadPopup from './EnhancedProcessArtifactUploadPopup';

export default function InterviewerEditPopup({ interviewer, onClose, onSave }) {
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
  const [artifacts, setArtifacts] = useState([]);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [artifactTypes, setArtifactTypes] = useState([]);
  const [isEditProfile, setIsEditProfile] = useState(false);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [selectedArtifactType, setSelectedArtifactType] = useState(null);

  useEffect(() => {
    if (interviewer) {
      setName(interviewer.name || '');
      setPosition(interviewer.position || '');
      setCompany(interviewer.company || '');
      setEmail(interviewer.email || '');
      setPhone(interviewer.phone || '');
      setPreviewUrl(interviewer.photoUrl || '/images/default-pfp.webp');
      loadArtifacts();
      loadArtifactTypes();
    } else {
      setName('');
      setPosition('');
      setCompany('');
      setEmail('');
      setPhone('');
      setPreviewUrl('/images/default-pfp.webp');
    }
  }, [interviewer, loadArtifacts]);

  const loadArtifacts = async () => {
    if (!interviewer || !interviewer.id) return;
    try {
      setIsLoadingArtifacts(true);
      const fetchedArtifacts = await artifactApi.getInterviewerArtifacts(interviewer.id);
      const formattedArtifacts = fetchedArtifacts.map(artifact => ({
        id: artifact.id,
        name: artifact.name,
        description: artifact.description || '',
        artifactType: artifact.artifact_type || 'other',
        dateAdded: artifact.date_added || artifact.created_at || new Date().toISOString(),
        fileUrl: artifact.file_url || artifact.url || '',
        fileType: artifact.file_type || '',
        fileSize: artifact.file_size || artifact.size || 0
      }));
      setArtifacts(formattedArtifacts);
    } catch (err) {
      setError('Failed to load artifacts');
    } finally {
      setIsLoadingArtifacts(false);
    }
  };

  const loadArtifactTypes = async () => {
    try {
      const types = await artifactApi.getArtifactTypes('process');
      setArtifactTypes(types);
      if (types && types.length > 0) {
        setSelectedArtifactType(types[0].id);
      }
    } catch (err) {
      // Failed to load artifact types - continue with empty array
    }
  };

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

  const handleUploadArtifact = () => {
    setShowUploadPopup(true);
  };

  const handleArtifactUploaded = async (artifactData) => {
    try {

      if (!artifactData.file) {
        setError('No file selected. Please select a file to upload.');
        return;
      }
      const uploadedArtifact = await artifactApi.addProcessArtifact(
        interviewer.id,
        {
          name: artifactData.name,
          description: artifactData.description,
          artifactType: artifactData.artifactType
        },
        artifactData.file
      );
      if (!uploadedArtifact) {
        setError('Upload failed - no data returned');
        return;
      }

      const formattedArtifact = {
        id: uploadedArtifact.id,
        name: uploadedArtifact.name,
        description: uploadedArtifact.description || '',
        artifactType: uploadedArtifact.artifact_type || 'other',
        dateAdded: uploadedArtifact.date_added || uploadedArtifact.created_at || new Date().toISOString(),
        fileUrl: uploadedArtifact.file_url || '',
        fileType: uploadedArtifact.file_type || '',
        fileSize: uploadedArtifact.file_size || 0
      };
      const missingFields = [];
      Object.keys(formattedArtifact).forEach(key => {
        if (formattedArtifact[key] === undefined) {

          missingFields.push(key);
          if (key === 'artifactType') formattedArtifact[key] = 'other';
          else if (key === 'description') formattedArtifact[key] = '';
          else if (key === 'fileUrl') formattedArtifact[key] = '';
          else if (key === 'fileType') formattedArtifact[key] = '';
          else if (key === 'fileSize') formattedArtifact[key] = 0;
        }
      });
      // Handle missing fields gracefully

      setArtifacts(prev => [formattedArtifact, ...prev]);
      setShowUploadPopup(false);
    } catch (err) {
      const errorMessage = err?.message || (typeof err === 'object' ? JSON.stringify(err) : 'Unknown error');
      setError(`Failed to upload artifact: ${errorMessage}`);
    }
  };

  const handleChangeArtifactType = (artifactId, newType) => {
    setArtifacts(artifacts.map(a => 
      a.id === artifactId ? { ...a, artifactType: newType } : a
    ));
  };

  const getArtifactIcon = (typeName) => {
    switch (typeName?.toLowerCase()) {
      case 'resume':
        return <DocumentIcon className="w-5 h-5 text-gray-500" />;
      case 'interview notes':
        return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
      case 'linkedin profile':
        return <LinkIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <DocumentIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#F0F7FF] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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

          {/* Artifacts Section */}
          <div className="px-6 pb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Interviewer Artifacts</h3>
              <button 
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-md flex items-center text-sm"
                onClick={handleUploadArtifact}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Artifact
              </button>
            </div>
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="text-xs text-gray-500 uppercase bg-[#F5F5F5]">
                  <tr>
                    <th className="py-2 px-4 text-left font-medium">Artifact</th>
                    <th className="py-2 px-4 text-left font-medium">Type</th>
                    <th className="py-2 px-4 text-left font-medium">Date Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoadingArtifacts ? (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-gray-500">Loading artifacts...</td>
                    </tr>
                  ) : artifacts.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-gray-500">No artifacts added yet</td>
                    </tr>
                  ) : (
                    artifacts.map(artifact => (
                      <tr key={artifact.id} className="hover:bg-gray-50">
                        <td className="py-2 px-4">
                          <div className="flex items-center">
                            {getArtifactIcon(artifactTypes.find(t => t.id === artifact.artifactType)?.name)}
                            <span className={`ml-2 text-sm ${artifactTypes.find(t => t.id === artifact.artifactType)?.name === 'linkedin profile' ? 'text-blue-600' : 'text-gray-800'}`}>
                              {artifact.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <select 
                            value={artifact.artifactType} 
                            onChange={(e) => handleChangeArtifactType(artifact.id, e.target.value)}
                            className="bg-white border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                            style={{ 
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, 
                              backgroundPosition: 'right 0.5rem center', 
                              backgroundSize: '1.5em 1.5em', 
                              backgroundRepeat: 'no-repeat' 
                            }}
                          >
                            {artifactTypes.map(type => (
                              <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-4 text-gray-600 text-sm">
                          {formatDate(artifact.dateAdded)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

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
      {showUploadPopup && (
        <EnhancedProcessArtifactUploadPopup
          interviewerId={interviewer.id}
          interviewerName={interviewer.name}
          onClose={() => setShowUploadPopup(false)}
          onSuccess={handleArtifactUploaded}
        />
      )}
    </div>
  );
}