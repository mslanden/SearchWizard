import { useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function ProjectHeaderEditPopup({ project, onClose, onSave }) {
  const popupRef = useRef(null);
  const [formData, setFormData] = useState({
    title: project.title || '',
    client: project.client || '',
    description: project.description || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40" onClick={onClose}>
      <div 
        ref={popupRef}
        className="rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-[#E6F0FF]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-700">Edit Project Details</h2>
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
                    Project Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
                    Client
                  </label>
                  <input
                    type="text"
                    id="client"
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
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
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
