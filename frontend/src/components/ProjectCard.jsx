import { useState } from 'react';
import Link from 'next/link';
import { DocumentIcon, EllipsisVerticalIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function ProjectCard({ project, onDelete, onUpdateTitle, onUpdateClient }) {
  const { id, title, client, date, artifactCount, backgroundColor = 'light-cream' } = project;
  const [showMenu, setShowMenu] = useState(false);
  const [showTitleEdit, setShowTitleEdit] = useState(false);
  const [showClientEdit, setShowClientEdit] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const [newClient, setNewClient] = useState(client);

  // Map background color classes
  const bgColorMap = {
    'light-cream': 'bg-[#FFF5E6]',
    'light-green': 'bg-[#E6FFE6]',
    'light-pink': 'bg-[#FFE6E6]',
    'light-blue': 'bg-[#E6F0FF]',
    'light-gray': 'bg-[#F5F5F5]'
  };

  const handleMenuClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (onDelete) {

      onDelete(id);
    } else {

    }
    setShowMenu(false);
  };

  const handleEditTitleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTitleEdit(true);
    setShowMenu(false);
  };

  const handleEditClientClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowClientEdit(true);
    setShowMenu(false);
  };

  const handleTitleSave = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (onUpdateTitle) {

      onUpdateTitle(id, newTitle);
    } else {

    }
    setShowTitleEdit(false);
  };

  const handleClientSave = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (onUpdateClient) {

      onUpdateClient(id, newClient);
    } else {

    }
    setShowClientEdit(false);
  };

  const handleOutsideClick = (e) => {
    if (showMenu || showTitleEdit || showClientEdit) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowMenu(false);
  };

  const handleCardClick = (e) => {
    if (showTitleEdit || showClientEdit || showMenu) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="relative" onClick={handleOutsideClick}>
      <Link href={`/projects/${id}`} onClick={handleCardClick}>
        <div className={`${bgColorMap[backgroundColor]} rounded-lg p-4 h-full transition-all hover:shadow-md relative`}>
          <div className="flex justify-between mb-2">
            <DocumentIcon className="w-6 h-6 text-gray-600" />
            <div className="relative">
              <button 
                onClick={handleMenuClick}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1">
                  <button
                    onClick={handleEditTitleClick}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <PencilIcon className="w-4 h-4 mr-2" />
                    Edit Title
                  </button>
                  <button
                    onClick={handleEditClientClick}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <PencilIcon className="w-4 h-4 mr-2" />
                    Edit Client
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        {showTitleEdit ? (
          <div className="mb-1">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full p-1 text-lg font-semibold border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex justify-end mt-1 space-x-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowTitleEdit(false);
                  setNewTitle(title);
                }}
                className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleTitleSave}
                className="px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
        )}
        <div className="text-sm text-gray-700">
          {showClientEdit ? (
            <div className="mb-2">
              <input
                type="text"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                className="w-full p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex justify-end mt-1 space-x-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowClientEdit(false);
                    setNewClient(client);
                  }}
                  className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClientSave}
                  className="px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p>{client}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-gray-700">{date}</span>
            <span className="text-gray-700">{artifactCount} artifacts</span>
          </div>
        </div>
      </div>
    </Link>
    </div>
  );
}
