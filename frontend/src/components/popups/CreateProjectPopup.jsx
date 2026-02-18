import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { projectsApi } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateProjectPopup({ onClose }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const popupRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    description: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim()) {
      alert('Project title is required');
      return;
    }

    if (!formData.client.trim()) {
      alert('Client name is required');
      return;
    }

    try {
      setIsSaving(true);

      // Check if user is authenticated
      if (!isAuthenticated || !user) {
        alert('You must be logged in to create a project. Please log in and try again.');
        setIsSaving(false);
        return;
      }

      // Format data for Supabase
      const formattedProject = {
        title: formData.title.trim(),
        client: formData.client.trim(),
        date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        artifactCount: 0,
        backgroundColor: 'light-cream' // Default background color
      };

      const newProject = await projectsApi.createProject(formattedProject);

      if (newProject && newProject.id) {
        // Close the popup
        onClose();
        // Navigate to the newly created project page
        router.push(`/projects/${newProject.id}`);
      } else {
        alert('Failed to save project. Please check the console for more details and ensure your Supabase connection is properly configured.');
      }
    } catch (err) {
      console.error('Error creating project:', err);
      alert('An error occurred while saving the project. Please check your connection to Supabase and ensure you have the proper permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40" onClick={onClose}>
      <div 
        ref={popupRef}
        className="rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto bg-[#E6F0FF]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-700">Create New Project</h2>
            <button 
              className="p-1 rounded-full hover:bg-gray-100"
              onClick={onClose}
            >
              <XMarkIcon className="w-6 h-6 text-gray-700" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    placeholder="Enter project title"
                  />
                </div>
                
                <div>
                  <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
                    Client *
                  </label>
                  <input
                    type="text"
                    id="client"
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    placeholder="Enter client name"
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="block w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter project description (optional)"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-brand-purple text-white rounded-md hover:bg-brand-purple-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSaving && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  )}
                  {isSaving ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}