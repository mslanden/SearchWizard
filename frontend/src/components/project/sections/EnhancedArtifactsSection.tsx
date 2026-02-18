"use client";

import React, { useState, useMemo, useCallback, memo } from 'react';
import { 
  MagnifyingGlassIcon, 
  AdjustmentsHorizontalIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  DocumentIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  CloudArrowUpIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Artifact } from '../../../types/project';

interface EnhancedArtifactsSectionProps {
  companyArtifacts: Artifact[];
  roleArtifacts: Artifact[];
  onDelete: (artifactId: string, artifactName: string, type: string) => void;
  deletingDocument: string | false;
  onAdd: (type: 'company' | 'role') => void;
}

type ViewMode = 'cards' | 'list';
type SortOption = 'name' | 'date' | 'type';
type FilterOption = 'all' | 'company' | 'role';

const EnhancedArtifactsSection = memo<EnhancedArtifactsSectionProps>(({ 
  companyArtifacts, 
  roleArtifacts, 
  onDelete, 
  deletingDocument, 
  onAdd 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedArtifacts, setSelectedArtifacts] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Combine and process artifacts
  const allArtifacts = useMemo(() => {
    const combined = [
      ...companyArtifacts.map(a => ({ ...a, category: 'company' as const })),
      ...roleArtifacts.map(a => ({ ...a, category: 'role' as const }))
    ];

    // Apply filters
    let filtered = combined;
    
    if (filterBy !== 'all') {
      filtered = filtered.filter(artifact => artifact.category === filterBy);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(artifact => 
        artifact.name.toLowerCase().includes(term) ||
        artifact.type.toLowerCase().includes(term) ||
        artifact.description?.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'date':
        default:
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      }
    });

    return filtered;
  }, [companyArtifacts, roleArtifacts, searchTerm, filterBy, sortBy]);

  const handleSelectArtifact = useCallback((artifactId: string) => {
    setSelectedArtifacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(artifactId)) {
        newSet.delete(artifactId);
      } else {
        newSet.add(artifactId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedArtifacts.size === allArtifacts.length) {
      setSelectedArtifacts(new Set());
    } else {
      setSelectedArtifacts(new Set(allArtifacts.map(a => a.id)));
    }
  }, [selectedArtifacts.size, allArtifacts]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedArtifacts.size === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedArtifacts.size} artifact${selectedArtifacts.size > 1 ? 's' : ''}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    // Delete selected artifacts
    for (const artifactId of selectedArtifacts) {
      const artifact = allArtifacts.find(a => a.id === artifactId);
      if (artifact) {
        try {
          await onDelete(artifactId, artifact.name, artifact.category);
        } catch (error) {
          console.error(`Failed to delete artifact ${artifact.name}:`, error);
        }
      }
    }
    
    setSelectedArtifacts(new Set());
  }, [selectedArtifacts, allArtifacts, onDelete]);

  return (
    <section className="mb-8">
      <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text">
              Project Artifacts
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onAdd('company')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-brand-purple hover:bg-brand-purple-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple"
              >
                <BuildingOfficeIcon className="w-4 h-4 mr-2" />
                Add Company
              </button>
              <button
                onClick={() => onAdd('role')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-dark-border text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-dark-text bg-white dark:bg-dark-bg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple"
              >
                <BriefcaseIcon className="w-4 h-4 mr-2" />
                Add Role
              </button>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search artifacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:ring-brand-purple focus:border-brand-purple dark:bg-dark-bg dark:text-dark-text"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-md border ${showFilters 
                  ? 'bg-brand-purple text-white border-brand-purple' 
                  : 'border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text bg-white dark:bg-dark-bg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary'
                }`}
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
              </button>

              {/* View Mode Toggle */}
              <div className="flex rounded-md border border-gray-300 dark:border-dark-border">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 ${viewMode === 'cards' 
                    ? 'bg-brand-purple text-white' 
                    : 'bg-white dark:bg-dark-bg text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary'
                  }`}
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 border-l border-gray-300 dark:border-dark-border ${viewMode === 'list' 
                    ? 'bg-brand-purple text-white' 
                    : 'bg-white dark:bg-dark-bg text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary'
                  }`}
                >
                  <ViewColumnsIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-dark-bg-tertiary rounded-md">
              <div className="flex flex-wrap gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Category
                  </label>
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                    className="block w-32 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md text-sm focus:ring-brand-purple focus:border-brand-purple dark:bg-dark-bg dark:text-dark-text"
                  >
                    <option value="all">All</option>
                    <option value="company">Company</option>
                    <option value="role">Role</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Sort by
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="block w-32 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md text-sm focus:ring-brand-purple focus:border-brand-purple dark:bg-dark-bg dark:text-dark-text"
                  >
                    <option value="date">Date Added</option>
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedArtifacts.size > 0 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedArtifacts.size} artifact{selectedArtifacts.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="w-4 h-4 mr-1" />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedArtifacts(new Set())}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <XMarkIcon className="w-4 h-4 mr-1" />
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {allArtifacts.length === 0 ? (
            <EmptyState 
              hasSearch={searchTerm.length > 0}
              onAddCompany={() => onAdd('company')}
              onAddRole={() => onAdd('role')}
            />
          ) : viewMode === 'cards' ? (
            <ArtifactCards
              artifacts={allArtifacts}
              selectedArtifacts={selectedArtifacts}
              onSelect={handleSelectArtifact}
              onDelete={onDelete}
              deletingDocument={deletingDocument}
            />
          ) : (
            <ArtifactTable
              artifacts={allArtifacts}
              selectedArtifacts={selectedArtifacts}
              onSelect={handleSelectArtifact}
              onSelectAll={handleSelectAll}
              onDelete={onDelete}
              deletingDocument={deletingDocument}
            />
          )}
        </div>
      </div>
    </section>
  );
});

// Empty State Component
const EmptyState = memo<{
  hasSearch: boolean;
  onAddCompany: () => void;
  onAddRole: () => void;
}>(({ hasSearch, onAddCompany, onAddRole }) => {
  if (hasSearch) {
    return (
      <div className="text-center py-12">
        <MagnifyingGlassIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-2">
          No artifacts found
        </h3>
        <p className="text-gray-500 dark:text-dark-text-secondary">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-2">
        No artifacts yet
      </h3>
      <p className="text-gray-500 dark:text-dark-text-secondary mb-6">
        Get started by uploading your first artifacts
      </p>
      <div className="flex justify-center space-x-4">
        <button
          onClick={onAddCompany}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-purple hover:bg-brand-purple-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple"
        >
          <BuildingOfficeIcon className="w-4 h-4 mr-2" />
          Add Company Artifact
        </button>
        <button
          onClick={onAddRole}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-dark-border text-sm font-medium rounded-md text-gray-700 dark:text-dark-text bg-white dark:bg-dark-bg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple"
        >
          <BriefcaseIcon className="w-4 h-4 mr-2" />
          Add Role Artifact
        </button>
      </div>
    </div>
  );
});

// Card View Component
const ArtifactCards = memo<{
  artifacts: (Artifact & { category: 'company' | 'role' })[];
  selectedArtifacts: Set<string>;
  onSelect: (id: string) => void;
  onDelete: (id: string, name: string, type: string) => void;
  deletingDocument: string | false;
}>(({ artifacts, selectedArtifacts, onSelect, onDelete, deletingDocument }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {artifacts.map((artifact) => (
        <ArtifactCard
          key={artifact.id}
          artifact={artifact}
          isSelected={selectedArtifacts.has(artifact.id)}
          onSelect={() => onSelect(artifact.id)}
          onDelete={() => onDelete(artifact.id, artifact.name, artifact.category)}
          isDeleting={deletingDocument === artifact.id}
        />
      ))}
    </div>
  );
});

// Individual Card Component
const ArtifactCard = memo<{
  artifact: Artifact & { category: 'company' | 'role' };
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}>(({ artifact, isSelected, onSelect, onDelete, isDeleting }) => {
  const getCategoryIcon = (category: string) => {
    return category === 'company' ? BuildingOfficeIcon : BriefcaseIcon;
  };

  const getCategoryColor = (category: string) => {
    return category === 'company' 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
  };

  const Icon = getCategoryIcon(artifact.category);

  return (
    <div 
      className={`relative p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'border-brand-purple bg-brand-purple/5 dark:bg-brand-purple/10' 
          : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg-secondary'
      }`}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-3 right-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
        />
      </div>

      {/* Content */}
      <div className="pr-8">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <DocumentIcon className="w-8 h-8 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">
              {artifact.name}
            </h3>
            <div className="mt-1 flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(artifact.category)}`}>
                <Icon className="w-3 h-3 mr-1" />
                {artifact.category}
              </span>
              <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
                {artifact.type}
              </span>
            </div>
            {artifact.description && (
              <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-secondary line-clamp-2">
                {artifact.description}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-400 dark:text-dark-text-muted">
              {artifact.dateAdded}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-dark-border pt-3">
        <div className="flex space-x-2">
          {artifact.url && (
            <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text">
              <EyeIcon className="w-4 h-4" />
            </button>
          )}
          {artifact.url && (
            <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text">
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="p-1 text-red-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-purple" />
          ) : (
            <TrashIcon className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
});

// Table View Component
const ArtifactTable = memo<{
  artifacts: (Artifact & { category: 'company' | 'role' })[];
  selectedArtifacts: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onDelete: (id: string, name: string, type: string) => void;
  deletingDocument: string | false;
}>(({ artifacts, selectedArtifacts, onSelect, onSelectAll, onDelete, deletingDocument }) => {
  const allSelected = artifacts.length > 0 && selectedArtifacts.size === artifacts.length;
  const someSelected = selectedArtifacts.size > 0 && selectedArtifacts.size < artifacts.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-dark-bg-tertiary">
          <tr>
            <th className="px-3 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={onSelectAll}
                className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
              />
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
              Name
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
              Category
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
              Type
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
              Date Added
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
          {artifacts.map((artifact) => (
            <ArtifactTableRow
              key={artifact.id}
              artifact={artifact}
              isSelected={selectedArtifacts.has(artifact.id)}
              onSelect={() => onSelect(artifact.id)}
              onDelete={() => onDelete(artifact.id, artifact.name, artifact.category)}
              isDeleting={deletingDocument === artifact.id}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});

// Table Row Component
const ArtifactTableRow = memo<{
  artifact: Artifact & { category: 'company' | 'role' };
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}>(({ artifact, isSelected, onSelect, onDelete, isDeleting }) => {
  const getCategoryIcon = (category: string) => {
    return category === 'company' ? BuildingOfficeIcon : BriefcaseIcon;
  };

  const getCategoryColor = (category: string) => {
    return category === 'company' 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
  };

  const Icon = getCategoryIcon(artifact.category);

  return (
    <tr 
      className={`hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors ${
        isSelected ? 'bg-brand-purple/5 dark:bg-brand-purple/10' : ''
      }`}
    >
      <td className="px-3 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
        />
      </td>
      <td className="px-3 py-4">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-dark-text">
            {artifact.name}
          </div>
          {artifact.description && (
            <div className="text-sm text-gray-500 dark:text-dark-text-secondary truncate max-w-xs">
              {artifact.description}
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-4">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(artifact.category)}`}>
          <Icon className="w-3 h-3 mr-1" />
          {artifact.category}
        </span>
      </td>
      <td className="px-3 py-4 text-sm text-gray-900 dark:text-dark-text">
        {artifact.type}
      </td>
      <td className="px-3 py-4 text-sm text-gray-500 dark:text-dark-text-secondary">
        {artifact.dateAdded}
      </td>
      <td className="px-3 py-4 text-right">
        <div className="flex items-center justify-end space-x-2">
          {artifact.url && (
            <>
              <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text">
                <EyeIcon className="w-4 h-4" />
              </button>
              <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text">
                <ArrowDownTrayIcon className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1 text-red-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-purple" />
            ) : (
              <TrashIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
});

// Set display names for better debugging
EnhancedArtifactsSection.displayName = 'EnhancedArtifactsSection';
EmptyState.displayName = 'EmptyState';
ArtifactCards.displayName = 'ArtifactCards';
ArtifactCard.displayName = 'ArtifactCard';
ArtifactTable.displayName = 'ArtifactTable';
ArtifactTableRow.displayName = 'ArtifactTableRow';

export default EnhancedArtifactsSection;