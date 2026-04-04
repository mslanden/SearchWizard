import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function ProjectHeader({ project, onEdit, onDelete }) {
  return (
    <div className="bg-[#FFF5E6] rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
          {project.description && (
            <p className="text-sm text-gray-600 mt-1 mb-2">{project.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            {project.client}
            {project.client && project.date && <span className="mx-2">·</span>}
            {project.date}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-2 rounded-full hover:bg-[#FFE8CC]"
            onClick={onEdit}
            aria-label="Edit project"
          >
            <PencilIcon className="w-5 h-5 text-gray-700" />
          </button>
          <button
            className="p-2 rounded-full hover:bg-red-50 group"
            onClick={onDelete}
            aria-label="Delete project"
          >
            <TrashIcon className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
