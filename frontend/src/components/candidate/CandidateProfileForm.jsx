import Image from 'next/image';
import { XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';

export default function CandidateProfileForm({ 
  name, 
  setName,
  role, 
  setRole,
  company, 
  setCompany,
  email, 
  setEmail,
  phone, 
  setPhone,
  previewUrl,
  onPhotoChange,
  onSubmit,
  onCancel,
  isSubmitting,
  onClose
}) {
  return (
    <>
      {/* Header with photo */}
      <div className="flex items-start p-6">
        <div className="relative mr-6">
          <div className="w-24 h-24 rounded-full overflow-hidden">
            <Image 
              src={previewUrl || '/images/default-pfp.webp'} 
              alt={name || 'Candidate'}
              width={96} 
              height={96} 
              style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
              className="rounded-full"
              onError={(e) => {
                e.target.src = '/images/default-pfp.webp';
              }}
            />
          </div>
          <label className="absolute bottom-0 right-0 bg-gray-100 rounded-full p-2 cursor-pointer hover:bg-gray-200 border border-white">
            <input 
              type="file" 
              className="hidden" 
              onChange={onPhotoChange}
              accept="image/*"
            />
            <UserCircleIcon className="w-5 h-5 text-gray-700" />
          </label>
        </div>

        <div className="flex-1">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Edit Candidate Profile</h2>
            <button 
              onClick={onClose} 
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <XMarkIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="px-6 py-4">
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
            <label htmlFor="role" className="block text-gray-700 mb-2">Current Role</label>
            <input
              id="role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter current role"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="company" className="block text-gray-700 mb-2">Current Company</label>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter current company"
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
            onClick={onCancel}
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
    </>
  );
}