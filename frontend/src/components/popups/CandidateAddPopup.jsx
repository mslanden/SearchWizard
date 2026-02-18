"use client";

import { useState } from 'react';
import { XMarkIcon, UserCircleIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import SecureFileUpload from '../SecureFileUpload';
import { validateForm, commonValidators, validators, sanitizers } from '../../utils/validation';

export default function CandidateAddPopup({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handlePhotoSelect = (file) => {
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setProfilePhoto(null);
      setPhotoPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Sanitize and validate inputs
    const formData = {
      name: sanitizers.trim(name),
      role: sanitizers.trim(role),
      company: sanitizers.trim(company),
      email: sanitizers.trim(email),
      phone: sanitizers.trim(phone)
    };

    const validationRules = {
      name: commonValidators.personName,
      role: [validators.maxLength(100)],
      company: [validators.maxLength(100)],
      email: email ? commonValidators.optionalEmail : [],
      phone: phone ? commonValidators.phone : []
    };

    const { isValid, errors } = validateForm(formData, validationRules);
    
    if (!isValid) {
      setFieldErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const candidateData = {
        name: formData.name,
        role: formData.role,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        profilePhoto,
        artifacts: 0, // Initial count of artifacts
        id: Date.now().toString() // Temporary ID until saved to database
      };

      await onAdd(candidateData);
      onClose();
    } catch (err) {
      setError('Failed to add candidate. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Add New Candidate</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Profile Photo (Optional)</label>
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <UserCircleIcon className="w-16 h-16 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <SecureFileUpload
                  acceptedTypes="images"
                  onFileSelect={handlePhotoSelect}
                  onError={(errors) => setFieldErrors(prev => ({ ...prev, photo: errors[0] }))}
                  maxSize={10485760} // 10MB
                  required={false}
                  showPreview={false}
                  className="w-full"
                />
                {fieldErrors.photo && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.photo}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-700 mb-2">Full Name *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 border ${fieldErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter candidate's full name"
              required
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="role" className="block text-gray-700 mb-2">Current Role</label>
              <input
                id="role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={`w-full px-3 py-2 border ${fieldErrors.role ? 'border-red-500' : 'border-gray-300'} rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Current position"
              />
              {fieldErrors.role && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.role}</p>
              )}
            </div>
            <div>
              <label htmlFor="company" className="block text-gray-700 mb-2">Current Company</label>
              <input
                id="company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={`w-full px-3 py-2 border ${fieldErrors.company ? 'border-red-500' : 'border-gray-300'} rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Current employer"
              />
              {fieldErrors.company && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.company}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="email" className="block text-gray-700 mb-2">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 py-2 border ${fieldErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Email address"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="phone" className="block text-gray-700 mb-2">Phone</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full px-3 py-2 border ${fieldErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Phone number"
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-brand-purple hover:bg-brand-purple-dark text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
