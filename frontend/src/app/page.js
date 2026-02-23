"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusIcon, Squares2X2Icon, ListBulletIcon, UserIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import Header from '../components/Header';
import ProjectCard from '../components/ProjectCard';
import ProjectList from '../components/ProjectList';
import AdminSetupNotice from '../components/AdminSetupNotice';
import CreateProjectPopup from '../components/popups/CreateProjectPopup';
import { projectsApi } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated, isApproved } = useAuth();
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('Most Recent');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateProjectPopupOpen, setIsCreateProjectPopupOpen] = useState(false);

  // Check authentication and approval status
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      if (!isApproved) {
        router.push('/pending-approval');
        return;
      }
    }
  }, [isAuthenticated, isApproved, authLoading, router]);

  // Fetch projects on component mount if authenticated and approved
  useEffect(() => {
    // Only fetch projects if the user is authenticated and approved
    if (isAuthenticated && isApproved) {
      const fetchProjects = async () => {
  try {
    setLoading(true);
    const projectData = await projectsApi.getProjects();

    // Transform database field names to match our component props
    const formattedProjects = projectData.map(project => ({
      id: project.id,
      title: project.title,
      client: project.client,
      date: project.date,
      artifactCount: project.artifact_count,
      backgroundColor: project.background_color || 'light-cream'
    }));
    setProjects(formattedProjects);
  } catch (err) {

    setError('Failed to load projects. Please check your connection and try again.');
    setProjects([]);
  } finally {
    setLoading(false);
  }
};

      fetchProjects();
    } else if (!authLoading) {
      // Not authenticated and not loading auth state
      setLoading(false);
    }
  }, [isAuthenticated, isApproved, authLoading]);

  // Handle project deletion
  const handleDeleteProject = async (id) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {

        // First check if the project exists in our local state
        const projectToDelete = projects.find(project => project.id === id);
        if (!projectToDelete) {

          alert('Cannot find the project to delete. Please refresh the page and try again.');
          return;
        }

        // Call the API to delete the project
        const success = await projectsApi.deleteProject(id);

        if (success) {

          setProjects(prevProjects => {
            const updatedProjects = prevProjects.filter(project => project.id !== id);

            return updatedProjects;
          });
          alert('Project deleted successfully!');
        } else {

          alert('Failed to delete project. This may be due to permission issues in Supabase. Please check your RLS policies.');
        }
      } catch (err) {

        alert('An error occurred while deleting the project. Please check the console for more details.');
      }
    }
  };

  // Handle project title update
  const handleUpdateProjectTitle = async (id, newTitle) => {

    try {

      const updatedProject = await projectsApi.updateProject(id, { title: newTitle });

      if (updatedProject) {

        setProjects(prevProjects => {
          const newProjects = prevProjects.map(project => 
            project.id === id ? { 
              ...project, 
              title: updatedProject.title 
            } : project
          );

          return newProjects;
        });
      } else {

        alert('Failed to update project title. Please try again.');
      }
    } catch (err) {

      alert('An error occurred while updating the title.');
    }
  };

  // Handle project client update
  const handleUpdateProjectClient = async (id, newClient) => {

    try {

      const updatedProject = await projectsApi.updateProject(id, { client: newClient });

      if (updatedProject) {

        setProjects(prevProjects => {
          const newProjects = prevProjects.map(project => 
            project.id === id ? { 
              ...project, 
              client: updatedProject.client 
            } : project
          );

          return newProjects;
        });
      } else {

        alert('Failed to update project client. Please try again.');
      }
    } catch (err) {

      alert('An error occurred while updating the client.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors">
      <Header />
      <AdminSetupNotice />
      <main className="container mx-auto px-4 py-8">
        {authLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
          </div>
        ) : isAuthenticated ? (
          // Authenticated user view
          <>
            <div className="mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">My Projects</h1>
            </div>

            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => setIsCreateProjectPopupOpen(true)}
                className="flex items-center space-x-2 bg-brand-purple hover:bg-brand-purple-dark text-white px-4 py-2 rounded-md shadow-sm transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Create new</span>
              </button>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-white dark:bg-dark-bg-secondary rounded-md shadow-sm p-1 transition-colors">
                  <button 
                    className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-dark-bg-tertiary text-gray-800 dark:text-dark-text' : 'text-gray-700 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text'}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <Squares2X2Icon className="w-5 h-5" />
                  </button>
                  <button 
                    className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-100 dark:bg-dark-bg-tertiary text-gray-800 dark:text-dark-text' : 'text-gray-700 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text'}`}
                    onClick={() => setViewMode('list')}
                  >
                    <ListBulletIcon className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  <select 
                    className="bg-white dark:bg-dark-bg-secondary border border-gray-300 dark:border-dark-border rounded-md pl-3 pr-8 py-2 text-sm text-gray-800 dark:text-dark-text font-medium appearance-none transition-colors"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option>Most Recent</option>
                    <option>Oldest</option>
                    <option>A-Z</option>
                    <option>Z-A</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
              </div>
            ) : error ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p>{error}</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <h3 className="text-lg font-medium text-gray-700 mb-2">No projects yet</h3>
                <p className="text-gray-500 mb-6">Create your first project to get started</p>
                <button 
                  onClick={() => setIsCreateProjectPopupOpen(true)}
                  className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors mx-auto"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>Create new project</span>
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {projects.map((project) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project}
                    onDelete={handleDeleteProject}
                    onUpdateTitle={handleUpdateProjectTitle}
                    onUpdateClient={handleUpdateProjectClient}
                  />
                ))}
              </div>
            ) : (
              <ProjectList 
                projects={projects} 
                onDelete={handleDeleteProject}
                onUpdateTitle={handleUpdateProjectTitle}
                onUpdateClient={handleUpdateProjectClient}
              />
            )}
          </>
        ) : (
          // Not authenticated view - login prompt
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-8 text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Search Wizard</h2>
                <p className="text-lg text-gray-600 mb-8">Your AI-powered job posting creation assistant</p>

                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="w-full max-w-md p-6 bg-[#E6F0FF] rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Sign in to get started</h3>
                    <p className="text-gray-600 mb-6">Access your projects and create new job postings</p>

                    <div className="flex flex-col space-y-4">
                      <Link href="/login">
                        <button className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md shadow-sm transition-colors">
                          <UserIcon className="w-5 h-5" />
                          <span>Sign in</span>
                        </button>
                      </Link>

                      <div className="text-center">
                        <span className="text-gray-500">Don&apos;t have an account?</span>
                        <Link href="/register" className="ml-2 text-purple-600 hover:text-purple-700 font-medium">
                          Create account
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 text-center">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">What you can do with Search Wizard</h3>
                    <ul className="mt-4 space-y-3 text-left max-w-md mx-auto">
                      <li className="flex items-start">
                        <ArrowRightIcon className="w-5 h-5 text-purple-600 mr-2 mt-0.5" />
                        <span>Create professional job postings with AI assistance</span>
                      </li>
                      <li className="flex items-start">
                        <ArrowRightIcon className="w-5 h-5 text-purple-600 mr-2 mt-0.5" />
                        <span>Organize and manage all your recruitment projects</span>
                      </li>
                      <li className="flex items-start">
                        <ArrowRightIcon className="w-5 h-5 text-purple-600 mr-2 mt-0.5" />
                        <span>Export job postings in multiple formats</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Create Project Popup */}
      {isCreateProjectPopupOpen && (
        <CreateProjectPopup 
          onClose={() => setIsCreateProjectPopupOpen(false)} 
        />
      )}
    </div>
  );
}
