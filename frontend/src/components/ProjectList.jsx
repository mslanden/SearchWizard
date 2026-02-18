import { useState } from 'react';
import Link from 'next/link';
import { DocumentIcon, EllipsisVerticalIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function ProjectList({ projects, onDelete, onUpdateTitle, onUpdateClient }) {
  const [editingProject, setEditingProject] = useState(null);
  const [editField, setEditField] = useState(null); // 'title' or 'client'
  const [editValue, setEditValue] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artifacts</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {projects.map((project) => {
  // Example completeness calculation: artifacts out of 5 required
  const completeness = Math.min(100, Math.round(((project.artifactCount || 0) / 5) * 100));
  let statusColor = 'bg-red-400';
  if (completeness >= 80) statusColor = 'bg-green-500';
  else if (completeness >= 50) statusColor = 'bg-yellow-400';
  return (
    <tr key={project.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        {editingProject === project.id && editField === 'title' ? (
          <div className="flex items-center">
            <DocumentIcon className="w-5 h-5 text-gray-500 mr-2" />
            <input
              type="text"
              className="w-full p-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex ml-2">
              <button
                onClick={() => setEditingProject(null)}
                className="p-1 text-xs bg-gray-200 rounded hover:bg-gray-300 mr-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdateTitle(project.id, editValue);
                  setEditingProject(null);
                }}
                className="p-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <Link href={`/projects/${project.id}`} className="flex items-center">
            <DocumentIcon className="w-5 h-5 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-900">{project.title}</span>
          </Link>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {editingProject === project.id && editField === 'client' ? (
          <div className="flex items-center">
            <input
              type="text"
              className="w-full p-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex ml-2">
              <button
                onClick={() => setEditingProject(null)}
                className="p-1 text-xs bg-gray-200 rounded hover:bg-gray-300 mr-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdateClient(project.id, editValue);
                  setEditingProject(null);
                }}
                className="p-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          project.client
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.date}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.artifactCount} artifacts</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${statusColor}`} aria-label={`Project completeness: ${completeness}%`}>
          {completeness}%
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 relative">
        <button 
          onClick={(e) => {
            e.preventDefault();
            setOpenMenuId(openMenuId === project.id ? null : project.id);
          }}
          className="p-1 rounded-full hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Open project actions menu"
        >
          <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
        </button>
        {openMenuId === project.id && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1" role="menu" aria-label="Project actions">
            <button
              onClick={(e) => {
                e.preventDefault();
                setEditingProject(project.id);
                setEditField('title');
                setEditValue(project.title);
                setOpenMenuId(null);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit Title
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                setEditingProject(project.id);
                setEditField('client');
                setEditValue(project.client);
                setOpenMenuId(null);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit Client
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onDelete(project.id);
                setOpenMenuId(null);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              role="menuitem"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
})}
        </tbody>
      </table>
    </div>
  );
}
