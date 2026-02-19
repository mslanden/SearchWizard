import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate Supabase configuration
if (!supabaseUrl || !supabaseAnonKey) {
}

// Create Supabase client with more detailed options
const isProduction = process.env.NODE_ENV === 'production';
const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'search-wizard-frontend'
    }
  }
});

// Helper function to check if user is admin (bypasses RLS issues)
export async function checkUserIsAdmin(userId) {
  try {
    const { data, error } = await supabase
      .rpc('check_is_admin', { check_user_id: userId });
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return data || false;
  } catch (err) {
    console.error('Error in checkUserIsAdmin:', err);
    return false;
  }
}

// Projects API
export const projectsApi = {
  // Storage bucket names for reference
  storageBuckets: {
    companyArtifacts: 'company-artifacts',
    roleArtifacts: 'role-artifacts',
    candidateArtifacts: 'candidate-artifacts',
    processArtifacts: 'process-artifacts',
    projectOutputs: 'project-outputs',
    goldenExamples: 'golden-examples'
  },

  // Get all projects for the current user
  async getProjects() {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      // Fetch projects for the current user
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    } catch (err) {
      return [];
    }
  },

  // Get a single project by ID (only for the current user)
  async getProjectById(id) {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return null;
      }

      // Fetch the project and ensure it belongs to the current user
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id) // Ensure the project belongs to the current user
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (err) {
      return null;
    }
  },

  // Create a new project
  async createProject(project) {
    // Validate input
    if (!project || typeof project !== 'object') {
      return null;
    }

    // Ensure we have the required fields
    if (!project.title) {
      return null;
    }

    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare the data to insert
      const projectData = {
        id: uuidv4(),
        title: project.title.trim(),
        client: project.client ? project.client.trim() : '',
        date: project.date || new Date().toISOString().split('T')[0],
        artifact_count: project.artifactCount || 0,
        background_color: project.backgroundColor || 'light-cream',
        user_id: user.id,
        created_at: new Date().toISOString()
      };

      // Insert the project
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select();

      // Handle insert errors
      if (error) {
        throw error;
      }

      // Check if data was returned
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No data returned from insert');
      }

      return data[0];
    } catch (err) {
      return null;
    }
  },

  // Update a project
  async updateProject(id, updates) {
    // Validate input
    if (!id) {
      return null;
    }

    if (!updates || typeof updates !== 'object') {
      return null;
    }

    const updateData = {};

    // Only include provided fields in the update and validate/sanitize them
    if (updates.title !== undefined) {
      if (typeof updates.title === 'string') {
        updateData.title = updates.title.trim();
      }
    }

    if (updates.client !== undefined) {
      if (typeof updates.client === 'string') {
        updateData.client = updates.client.trim();
      }
    }

    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.artifactCount !== undefined) updateData.artifact_count = updates.artifactCount;
    if (updates.backgroundColor !== undefined) updateData.background_color = updates.backgroundColor;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return null;
    }

    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select();

      if (error) {
        throw error;
      }

      // Check if data was returned
      if (!data || !Array.isArray(data) || data.length === 0) {
        // Try to fetch the project to see if it was updated
        const { data: fetchedData, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        return fetchedData;
      }

      return data[0];
    } catch (err) {
      return null;
    }
  },

  // Delete a project
  async deleteProject(id) {
    // Validate input
    if (!id) {
      return false;
    }

    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // First, verify the project exists
      const { data: existingProject, error: fetchError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!existingProject) {
        throw new Error('Project not found');
      }

      // Execute the delete operation
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      return true;
    } catch (err) {
      return false;
    }
  }
};