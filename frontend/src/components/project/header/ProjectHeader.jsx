import { PencilIcon } from '@heroicons/react/24/outline';

export default function ProjectHeader({ project, onEdit }) {
  return (
    <div className="bg-[#FFF5E6] rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.title}</h1>
          <p className="text-gray-700 mb-1">{project.client}</p>
          <p className="text-gray-700 text-sm">{project.date}</p>
        </div>
        <button 
          className="p-2 rounded-full hover:bg-[#FFE8CC]"
          onClick={onEdit}
        >
          <PencilIcon className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  );
}