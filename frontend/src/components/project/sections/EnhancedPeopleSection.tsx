"use client";

import React, { useState, useMemo, useCallback, memo } from 'react';
import { 
  MagnifyingGlassIcon, 
  AdjustmentsHorizontalIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  UserIcon,
  UserGroupIcon,
  EyeIcon,
  PencilIcon,
  DocumentIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { Candidate, Interviewer } from '../../../types/project';

interface EnhancedPeopleSectionProps {
  candidates: Candidate[];
  interviewers: Interviewer[];
  onAddCandidate: () => void;
  onEditCandidate: (candidate: Candidate) => void;
  onAddInterviewer: () => void;
  onEditInterviewer: (interviewer: Interviewer) => void;
}

type ViewMode = 'cards' | 'list';
type SortOption = 'name' | 'role' | 'company' | 'artifacts';
type FilterOption = 'all' | 'candidates' | 'interviewers';
type PersonType = 'candidate' | 'interviewer';

interface PersonWithType {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  photoUrl?: string;
  artifacts?: number;
  type: PersonType;
  role?: string; // For candidates
  position?: string; // For interviewers
}

const EnhancedPeopleSection = memo<EnhancedPeopleSectionProps>(({ 
  candidates, 
  interviewers, 
  onAddCandidate,
  onEditCandidate,
  onAddInterviewer,
  onEditInterviewer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['candidates', 'interviewers']));

  // Combine and process people
  const allPeople = useMemo(() => {
    const combined: PersonWithType[] = [
      ...candidates.map(c => ({ ...c, type: 'candidate' as const })),
      ...interviewers.map(i => ({ ...i, type: 'interviewer' as const }))
    ];

    // Apply filters
    let filtered = combined;
    
    if (filterBy !== 'all') {
      filtered = filtered.filter(person => {
        if (filterBy === 'candidates') return person.type === 'candidate';
        if (filterBy === 'interviewers') return person.type === 'interviewer';
        return true;
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(person => 
        person.name.toLowerCase().includes(term) ||
        (person.role || person.position || '').toLowerCase().includes(term) ||
        (person.company || '').toLowerCase().includes(term) ||
        (person.email || '').toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'role':
          const roleA = a.role || a.position || '';
          const roleB = b.role || b.position || '';
          return roleA.localeCompare(roleB);
        case 'company':
          return (a.company || '').localeCompare(b.company || '');
        case 'artifacts':
        default:
          return (b.artifacts || 0) - (a.artifacts || 0);
      }
    });

    return filtered;
  }, [candidates, interviewers, searchTerm, filterBy, sortBy]);

  const candidateCount = candidates.length;
  const interviewerCount = interviewers.length;
  const totalArtifacts = [...candidates, ...interviewers].reduce((sum, person) => sum + (person.artifacts || 0), 0);

  const handleSelectPerson = useCallback((personId: string) => {
    setSelectedPeople(prev => {
      const newSet = new Set(prev);
      if (newSet.has(personId)) {
        newSet.delete(personId);
      } else {
        newSet.add(personId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedPeople.size === allPeople.length) {
      setSelectedPeople(new Set());
    } else {
      setSelectedPeople(new Set(allPeople.map(p => p.id)));
    }
  }, [selectedPeople.size, allPeople]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  return (
    <section className="mb-8">
      <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text">
                People & Artifacts
              </h2>
              <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
                {candidateCount} candidates, {interviewerCount} interviewers, {totalArtifacts} total artifacts
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onAddCandidate}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Add Candidate
              </button>
              <button
                onClick={onAddInterviewer}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-dark-border text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-dark-text bg-white dark:bg-dark-bg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UserGroupIcon className="w-4 h-4 mr-2" />
                Add Interviewer
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
                placeholder="Search people..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-md border ${showFilters 
                  ? 'bg-blue-600 text-white border-blue-600' 
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
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white dark:bg-dark-bg text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary'
                  }`}
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 border-l border-gray-300 dark:border-dark-border ${viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
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
                    className="block w-36 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
                  >
                    <option value="all">All People</option>
                    <option value="candidates">Candidates</option>
                    <option value="interviewers">Interviewers</option>
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
                    className="block w-32 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
                  >
                    <option value="name">Name</option>
                    <option value="role">Role</option>
                    <option value="company">Company</option>
                    <option value="artifacts">Artifacts</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedPeople.size > 0 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedPeople.size} person{selectedPeople.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <button className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <PencilIcon className="w-4 h-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => setSelectedPeople(new Set())}
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
          {allPeople.length === 0 ? (
            <EmptyState 
              hasSearch={searchTerm.length > 0}
              onAddCandidate={onAddCandidate}
              onAddInterviewer={onAddInterviewer}
            />
          ) : (
            <div className="space-y-6">
              {/* Grouped by Type */}
              {filterBy === 'all' ? (
                <>
                  {/* Candidates Section */}
                  {candidates.length > 0 && (
                    <CollapsibleSection
                      title="Candidates"
                      count={candidateCount}
                      isExpanded={expandedSections.has('candidates')}
                      onToggle={() => toggleSection('candidates')}
                      icon={UserIcon}
                      color="blue"
                    >
                      {viewMode === 'cards' ? (
                        <PeopleCards
                          people={allPeople.filter(p => p.type === 'candidate')}
                          selectedPeople={selectedPeople}
                          onSelect={handleSelectPerson}
                          onEdit={(person) => onEditCandidate(person as Candidate)}
                        />
                      ) : (
                        <PeopleTable
                          people={allPeople.filter(p => p.type === 'candidate')}
                          selectedPeople={selectedPeople}
                          onSelect={handleSelectPerson}
                          onSelectAll={handleSelectAll}
                          onEdit={(person) => onEditCandidate(person as Candidate)}
                        />
                      )}
                    </CollapsibleSection>
                  )}

                  {/* Interviewers Section */}
                  {interviewers.length > 0 && (
                    <CollapsibleSection
                      title="Interviewers"
                      count={interviewerCount}
                      isExpanded={expandedSections.has('interviewers')}
                      onToggle={() => toggleSection('interviewers')}
                      icon={UserGroupIcon}
                      color="green"
                    >
                      {viewMode === 'cards' ? (
                        <PeopleCards
                          people={allPeople.filter(p => p.type === 'interviewer')}
                          selectedPeople={selectedPeople}
                          onSelect={handleSelectPerson}
                          onEdit={(person) => onEditInterviewer(person as Interviewer)}
                        />
                      ) : (
                        <PeopleTable
                          people={allPeople.filter(p => p.type === 'interviewer')}
                          selectedPeople={selectedPeople}
                          onSelect={handleSelectPerson}
                          onSelectAll={handleSelectAll}
                          onEdit={(person) => onEditInterviewer(person as Interviewer)}
                        />
                      )}
                    </CollapsibleSection>
                  )}
                </>
              ) : (
                /* Unified View when Filtered */
                viewMode === 'cards' ? (
                  <PeopleCards
                    people={allPeople}
                    selectedPeople={selectedPeople}
                    onSelect={handleSelectPerson}
                    onEdit={(person) => {
                      if (person.type === 'candidate') {
                        onEditCandidate(person as Candidate);
                      } else {
                        onEditInterviewer(person as Interviewer);
                      }
                    }}
                  />
                ) : (
                  <PeopleTable
                    people={allPeople}
                    selectedPeople={selectedPeople}
                    onSelect={handleSelectPerson}
                    onSelectAll={handleSelectAll}
                    onEdit={(person) => {
                      if (person.type === 'candidate') {
                        onEditCandidate(person as Candidate);
                      } else {
                        onEditInterviewer(person as Interviewer);
                      }
                    }}
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

// Collapsible Section Component
const CollapsibleSection = memo<{
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green';
  children: React.ReactNode;
}>(({ title, count, isExpanded, onToggle, icon: Icon, color, children }) => {
  const colorClasses: Record<'blue' | 'green', string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400'
  };

  return (
    <div className="border border-gray-200 dark:border-dark-border rounded-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-dark-bg-tertiary hover:bg-gray-100 dark:hover:bg-dark-bg-quaternary rounded-t-lg transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Icon className={`w-5 h-5 ${colorClasses[color]}`} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">
            {title}
          </h3>
          <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
            ({count})
          </span>
        </div>
        {isExpanded ? (
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
});

// Empty State Component
const EmptyState = memo<{
  hasSearch: boolean;
  onAddCandidate: () => void;
  onAddInterviewer: () => void;
}>(({ hasSearch, onAddCandidate, onAddInterviewer }) => {
  if (hasSearch) {
    return (
      <div className="text-center py-12">
        <MagnifyingGlassIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-2">
          No people found
        </h3>
        <p className="text-gray-500 dark:text-dark-text-secondary">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-2">
        No people yet
      </h3>
      <p className="text-gray-500 dark:text-dark-text-secondary mb-6">
        Get started by adding candidates and interviewers
      </p>
      <div className="flex justify-center space-x-4">
        <button
          onClick={onAddCandidate}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserIcon className="w-4 h-4 mr-2" />
          Add Candidate
        </button>
        <button
          onClick={onAddInterviewer}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-dark-border text-sm font-medium rounded-md text-gray-700 dark:text-dark-text bg-white dark:bg-dark-bg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserGroupIcon className="w-4 h-4 mr-2" />
          Add Interviewer
        </button>
      </div>
    </div>
  );
});

// Card View Component
const PeopleCards = memo<{
  people: PersonWithType[];
  selectedPeople: Set<string>;
  onSelect: (id: string) => void;
  onEdit: (person: PersonWithType) => void;
}>(({ people, selectedPeople, onSelect, onEdit }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {people.map((person) => (
        <PersonCard
          key={person.id}
          person={person}
          isSelected={selectedPeople.has(person.id)}
          onSelect={() => onSelect(person.id)}
          onEdit={() => onEdit(person)}
        />
      ))}
    </div>
  );
});

// Individual Card Component
const PersonCard = memo<{
  person: PersonWithType;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}>(({ person, isSelected, onSelect, onEdit }) => {
  const getTypeColor = (type: PersonType) => {
    return type === 'candidate' 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
  };

  const getTypeIcon = (type: PersonType) => {
    return type === 'candidate' ? UserIcon : UserGroupIcon;
  };

  const Icon = getTypeIcon(person.type);

  return (
    <div 
      className={`relative p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' 
          : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg-secondary'
      }`}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-3 right-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>

      {/* Content */}
      <div className="pr-8">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <img
              src={person.photoUrl || '/images/default-pfp.webp'}
              alt={person.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">
              {person.name}
            </h3>
            <div className="mt-1 flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(person.type)}`}>
                <Icon className="w-3 h-3 mr-1" />
                {person.type}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-600 dark:text-dark-text-secondary">
              {person.role || person.position}
            </p>
            {person.company && (
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                {person.company}
              </p>
            )}
            <div className="mt-2 flex items-center text-xs text-gray-400 dark:text-dark-text-muted">
              <DocumentIcon className="w-3 h-3 mr-1" />
              {person.artifacts || 0} artifacts
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-dark-border pt-3">
        <div className="flex space-x-2">
          <button 
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text">
            <EyeIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-gray-400 dark:text-dark-text-muted">
          {person.email}
        </div>
      </div>
    </div>
  );
});

// Table View Component
const PeopleTable = memo<{
  people: PersonWithType[];
  selectedPeople: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onEdit: (person: PersonWithType) => void;
}>(({ people, selectedPeople, onSelect, onSelectAll, onEdit }) => {
  const allSelected = people.length > 0 && selectedPeople.size === people.length;
  const someSelected = selectedPeople.size > 0 && selectedPeople.size < people.length;

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
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
              Person
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
              Type
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
              Role
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
              Company
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
              Artifacts
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
          {people.map((person) => (
            <PersonTableRow
              key={person.id}
              person={person}
              isSelected={selectedPeople.has(person.id)}
              onSelect={() => onSelect(person.id)}
              onEdit={() => onEdit(person)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});

// Table Row Component
const PersonTableRow = memo<{
  person: PersonWithType;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}>(({ person, isSelected, onSelect, onEdit }) => {
  const getTypeColor = (type: PersonType) => {
    return type === 'candidate' 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
  };

  const getTypeIcon = (type: PersonType) => {
    return type === 'candidate' ? UserIcon : UserGroupIcon;
  };

  const Icon = getTypeIcon(person.type);

  return (
    <tr 
      className={`hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors ${
        isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
      }`}
    >
      <td className="px-3 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>
      <td className="px-3 py-4">
        <div className="flex items-center">
          <img
            src={person.photoUrl || '/images/default-pfp.webp'}
            alt={person.name}
            className="w-8 h-8 rounded-full object-cover mr-3"
          />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-dark-text">
              {person.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-text-secondary">
              {person.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-4">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(person.type)}`}>
          <Icon className="w-3 h-3 mr-1" />
          {person.type}
        </span>
      </td>
      <td className="px-3 py-4 text-sm text-gray-900 dark:text-dark-text">
        {person.role || person.position || '-'}
      </td>
      <td className="px-3 py-4 text-sm text-gray-900 dark:text-dark-text">
        {person.company || '-'}
      </td>
      <td className="px-3 py-4 text-sm text-gray-500 dark:text-dark-text-secondary">
        <div className="flex items-center">
          <DocumentIcon className="w-4 h-4 mr-1" />
          {person.artifacts || 0}
        </div>
      </td>
      <td className="px-3 py-4 text-right">
        <div className="flex items-center justify-end space-x-2">
          <button 
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text">
            <EyeIcon className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

// Set display names for better debugging
EnhancedPeopleSection.displayName = 'EnhancedPeopleSection';
CollapsibleSection.displayName = 'CollapsibleSection';
EmptyState.displayName = 'EmptyState';
PeopleCards.displayName = 'PeopleCards';
PersonCard.displayName = 'PersonCard';
PeopleTable.displayName = 'PeopleTable';
PersonTableRow.displayName = 'PersonTableRow';

export default EnhancedPeopleSection;