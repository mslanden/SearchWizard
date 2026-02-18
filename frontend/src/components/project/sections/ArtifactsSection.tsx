import React, { memo, useCallback } from 'react';
import { PlusIcon, BuildingOfficeIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { Artifact } from '../../../types/project';

interface ArtifactTableProps {
  artifacts: Artifact[];
  onDelete: (artifactId: string, artifactName: string, type: string) => void;
  deletingDocument: string | false;
  onAdd: (type: 'company' | 'role') => void;
  type: 'company' | 'role';
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ArtifactTable = memo<ArtifactTableProps>(({ 
  artifacts, 
  onDelete, 
  deletingDocument, 
  onAdd, 
  type, 
  title, 
  icon: Icon 
}) => {
  const handleAddClick = useCallback(() => {
    onAdd(type);
  }, [onAdd, type]);

  const handleDeleteClick = useCallback((artifactId: string, artifactName: string) => {
    onDelete(artifactId, artifactName, type);
  }, [onDelete, type]);

  return (
    <div className="bg-white dark:bg-dark-bg-secondary rounded-lg p-6 shadow-sm border border-gray-200 dark:border-dark-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Icon className="w-5 h-5 mr-2 text-gray-700 dark:text-dark-text-secondary" />
          <h2 className="text-lg font-medium text-gray-900 dark:text-dark-text">{title}</h2>
        </div>
        <button 
          onClick={handleAddClick}
          className="text-sm text-brand-purple dark:text-brand-purple-light flex items-center font-medium hover:text-brand-purple-dark dark:hover:text-brand-purple transition-colors focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2"
          aria-label={`Add ${type} artifact`}
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          Add
        </button>
      </div>

      {artifacts.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-dark-text-secondary">
          <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No {type} artifacts yet</p>
          <p className="text-sm mt-1">Click "Add" to upload your first artifact</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-xs text-gray-500 dark:text-dark-text-secondary uppercase bg-gray-50 dark:bg-dark-bg-tertiary border-b border-gray-200 dark:border-dark-border">
              <tr>
                <th className="py-2 px-3 text-left font-medium">Artifact</th>
                <th className="py-2 px-3 text-left font-medium">Type</th>
                <th className="py-2 px-3 text-left font-medium">Date Added</th>
                <th className="py-2 px-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
              {artifacts.map(artifact => (
                <ArtifactRow
                  key={artifact.id}
                  artifact={artifact}
                  onDelete={handleDeleteClick}
                  isDeleting={deletingDocument === artifact.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

ArtifactTable.displayName = 'ArtifactTable';

interface ArtifactRowProps {
  artifact: Artifact;
  onDelete: (artifactId: string, artifactName: string) => void;
  isDeleting: boolean;
}

const ArtifactRow = memo<ArtifactRowProps>(({ artifact, onDelete, isDeleting }) => {
  const handleDelete = useCallback(() => {
    onDelete(artifact.id, artifact.name);
  }, [onDelete, artifact.id, artifact.name]);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
      <td className="py-3 px-3">
        <div className="flex items-center">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-dark-text">
              {artifact.name}
            </div>
            {artifact.description && (
              <div className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1 max-w-xs truncate">
                {artifact.description}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 px-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-dark-bg-tertiary text-gray-800 dark:text-dark-text-secondary">
          {artifact.type}
        </span>
      </td>
      <td className="py-3 px-3 text-gray-700 dark:text-dark-text-secondary text-sm">
        {artifact.dateAdded}
      </td>
      <td className="py-3 px-3 text-right">
        <button 
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          aria-label={`Delete ${artifact.name}`}
        >
          {isDeleting ? (
            <span className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Deleting...
            </span>
          ) : (
            'Delete'
          )}
        </button>
      </td>
    </tr>
  );
});

ArtifactRow.displayName = 'ArtifactRow';

interface ArtifactsSectionProps {
  companyArtifacts: Artifact[];
  roleArtifacts: Artifact[];
  onDelete: (artifactId: string, artifactName: string, type: string) => void;
  deletingDocument: string | false;
  onAdd: (type: 'company' | 'role') => void;
}

const ArtifactsSection = memo<ArtifactsSectionProps>(({ 
  companyArtifacts, 
  roleArtifacts, 
  onDelete, 
  deletingDocument, 
  onAdd 
}) => {
  return (
    <section className="mb-8" aria-labelledby="artifacts-heading">
      <h2 id="artifacts-heading" className="sr-only">Project Artifacts</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ArtifactTable
          artifacts={companyArtifacts}
          onDelete={onDelete}
          deletingDocument={deletingDocument}
          onAdd={onAdd}
          type="company"
          title="Company Artifacts"
          icon={BuildingOfficeIcon}
        />
        <ArtifactTable
          artifacts={roleArtifacts}
          onDelete={onDelete}
          deletingDocument={deletingDocument}
          onAdd={onAdd}
          type="role"
          title="Role Artifacts"
          icon={BriefcaseIcon}
        />
      </div>
    </section>
  );
});

ArtifactsSection.displayName = 'ArtifactsSection';

export default ArtifactsSection;