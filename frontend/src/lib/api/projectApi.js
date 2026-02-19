import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { storageBuckets } from './config';
import { storageApi } from './storageApi';
import { 
  getCurrentUser, 
  handleApiError, 
  validateRequiredFields, 
  transformDatabaseObject,
  incrementCount
} from './utils';

export const projectApi = {
  // Add a company artifact to a project
  async addCompanyArtifact(projectId, artifactData, file) {
    try {
      const user = await getCurrentUser();
      
      validateRequiredFields(artifactData, ['name']);
      
      const inputType = artifactData.inputType || 'file';
      let uploadResult = null;
      let processedContent = null;

      // Handle different input types
      if (inputType === 'file') {
        if (!file) {
          throw new Error('File is required for file uploads');
        }
        
        // Upload file to storage - folder must start with user ID for storage policies
        uploadResult = await storageApi.uploadFile(
          file,
          storageBuckets.companyArtifacts,
          `${user.id}/project_${projectId}`
        );
      } else if (inputType === 'url') {
        if (!artifactData.sourceUrl) {
          throw new Error('Source URL is required for URL artifacts');
        }
        
        // Process URL content via backend
        const result = await storageApi.processUrlContent(
          artifactData.sourceUrl,
          artifactData.artifactType
        );
        processedContent = result?.processedContent || '';
        
        // Log for debugging
        console.log('URL processing result:', result);
      } else if (inputType === 'text') {
        if (!artifactData.textContent) {
          throw new Error('Text content is required for text artifacts');
        }
        
        // Save text content directly without backend processing
        processedContent = artifactData.textContent;
      }

      // Insert artifact record
      const artifactRecord = {
        id: uuidv4(),
        project_id: projectId,
        name: artifactData.name,
        description: artifactData.description || '',
        artifact_type: 'company',
        input_type: inputType,
        user_id: user.id,  // Changed from created_by to user_id
        created_at: new Date().toISOString()
      };

      // Add type-specific fields
      if (inputType === 'file' && uploadResult) {
        artifactRecord.file_url = uploadResult.url;
        artifactRecord.file_path = uploadResult.path;
        artifactRecord.file_type = uploadResult.type;
        artifactRecord.file_size = uploadResult.size;
      } else if (inputType === 'url') {
        artifactRecord.source_url = artifactData.sourceUrl;
        artifactRecord.processed_content = processedContent;
        artifactRecord.file_type = 'url';
        artifactRecord.file_url = artifactData.sourceUrl; // Store URL here too for compatibility
      } else if (inputType === 'text') {
        artifactRecord.processed_content = processedContent;
        artifactRecord.file_type = 'text';
        artifactRecord.description = artifactData.description || processedContent.substring(0, 200) + '...';
      }

      const { data, error } = await supabase
        .from('artifacts')
        .insert(artifactRecord)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Increment project artifact count
      await incrementCount('projects', 'id', projectId, 'artifact_count');

      return transformDatabaseObject(data);
    } catch (error) {
      handleApiError(error, 'add company artifact');
    }
  },

  // Add a role artifact to a project
  async addRoleArtifact(projectId, artifactData, file) {
    try {
      const user = await getCurrentUser();
      
      validateRequiredFields(artifactData, ['name']);
      
      const inputType = artifactData.inputType || 'file';
      let uploadResult = null;
      let processedContent = null;

      // Handle different input types
      if (inputType === 'file') {
        if (!file) {
          throw new Error('File is required for file uploads');
        }
        
        // Upload file to storage - folder must start with user ID for storage policies
        uploadResult = await storageApi.uploadFile(
          file,
          storageBuckets.roleArtifacts,
          `${user.id}/project_${projectId}`
        );
      } else if (inputType === 'url') {
        if (!artifactData.sourceUrl) {
          throw new Error('Source URL is required for URL artifacts');
        }
        
        // Process URL content via backend
        const result = await storageApi.processUrlContent(
          artifactData.sourceUrl,
          artifactData.artifactType
        );
        processedContent = result?.processedContent || '';
        
        // Log for debugging
        console.log('URL processing result:', result);
      } else if (inputType === 'text') {
        if (!artifactData.textContent) {
          throw new Error('Text content is required for text artifacts');
        }
        
        // Save text content directly without backend processing for consistency
        processedContent = artifactData.textContent;
      }

      // Insert artifact record
      const artifactRecord = {
        id: uuidv4(),
        project_id: projectId,
        name: artifactData.name,
        description: artifactData.description || '',
        artifact_type: 'role',
        input_type: inputType,
        user_id: user.id
      };

      // Add type-specific fields
      if (inputType === 'file' && uploadResult) {
        artifactRecord.file_url = uploadResult.url;
        artifactRecord.file_path = uploadResult.path;
        artifactRecord.file_type = uploadResult.type;
        artifactRecord.file_size = uploadResult.size;
      } else if (inputType === 'url') {
        artifactRecord.source_url = artifactData.sourceUrl;
        artifactRecord.processed_content = processedContent;
        artifactRecord.file_type = 'url';
        artifactRecord.file_url = artifactData.sourceUrl; // Store URL here too for compatibility
      } else if (inputType === 'text') {
        artifactRecord.processed_content = processedContent;
        artifactRecord.file_type = 'text';
        artifactRecord.description = artifactData.description || processedContent.substring(0, 200) + '...';
      }

      const { data, error } = await supabase
        .from('artifacts')
        .insert(artifactRecord)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Increment project artifact count
      await incrementCount('projects', 'id', projectId, 'artifact_count');

      return transformDatabaseObject(data);
    } catch (error) {
      handleApiError(error, 'add role artifact');
    }
  },

  // Get artifacts for a project by type
  async getArtifacts(projectId, type = null) {
    try {
      let query = supabase
        .from('artifacts')
        .select('*')
        .eq('project_id', projectId);

      if (type) {
        query = query.eq('artifact_type', type);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(transformDatabaseObject);
    } catch (error) {
      handleApiError(error, 'get artifacts');
    }
  },

  // Delete an artifact
  async deleteArtifact(artifactId, artifactType) {
    try {
      console.log(`🔄 [deleteArtifact] Starting deletion for artifact ${artifactId} of type ${artifactType}`);
      
      // Get artifact data for file cleanup
      const { data: artifact, error: fetchError } = await supabase
        .from('artifacts')
        .select('file_path, project_id, file_url')
        .eq('id', artifactId)
        .single();

      if (fetchError) {
        console.error('❌ [deleteArtifact] Failed to fetch artifact:', fetchError);
        throw fetchError;
      }

      console.log('📋 [deleteArtifact] Artifact details:', { 
        id: artifactId, 
        file_path: artifact.file_path,
        file_url: artifact.file_url?.substring(0, 100) + '...',
        project_id: artifact.project_id 
      });

      // Determine correct bucket based on artifact type
      const bucket = artifactType === 'company' 
        ? storageBuckets.companyArtifacts 
        : storageBuckets.roleArtifacts;

      console.log(`🗂️ [deleteArtifact] Using bucket: ${bucket}`);

      // Delete file from storage if it exists
      if (artifact.file_path) {
        console.log(`🔄 [deleteArtifact] Deleting file from storage: ${artifact.file_path}`);
        try {
          await storageApi.deleteFile(bucket, artifact.file_path);
          console.log('✅ [deleteArtifact] File deleted from storage');
        } catch (storageError) {
          console.warn('⚠️ [deleteArtifact] Storage deletion failed (continuing):', storageError.message);
          // Continue with database deletion even if storage fails
        }
      } else {
        console.log('ℹ️ [deleteArtifact] No file_path found, skipping storage deletion');
      }

      // Delete artifact record from database
      console.log('🔄 [deleteArtifact] Deleting database record');
      const { error } = await supabase
        .from('artifacts')
        .delete()
        .eq('id', artifactId);

      if (error) {
        console.error('❌ [deleteArtifact] Database deletion failed:', error);
        throw error;
      }

      console.log('✅ [deleteArtifact] Database record deleted');

      // Decrement project artifact count
      console.log('🔄 [deleteArtifact] Updating project artifact count');
      try {
        await decrementCount('projects', 'id', artifact.project_id, 'artifact_count');
        console.log('✅ [deleteArtifact] Project count updated');
      } catch (countError) {
        console.warn('⚠️ [deleteArtifact] Count update failed (non-critical):', countError.message);
        // Non-critical error, don't fail the whole operation
      }

      console.log('✅ [deleteArtifact] Deletion completed successfully');
      return true;
    } catch (error) {
      console.error('❌ [deleteArtifact] Final error:', error);
      handleApiError(error, 'delete artifact');
    }
  },

  // Add project output
  async addProjectOutput(projectId, outputData, file) {
    try {
      const user = await getCurrentUser();
      
      validateRequiredFields(outputData, ['name']);
      
      if (!file) {
        throw new Error('File is required');
      }

      // Upload file to storage (use user ID as folder to comply with RLS policy)
      const uploadResult = await storageApi.uploadFile(
        file,
        storageBuckets.projectOutputs,
        user.id  // Use user ID as folder to match RLS policy
      );

      // Insert output record
      const { data, error } = await supabase
        .from('project_outputs')
        .insert({
          id: uuidv4(),
          project_id: projectId,
          name: outputData.name,
          description: outputData.description || '',
          output_type: outputData.output_type || 'document',
          file_url: uploadResult.url,
          file_path: uploadResult.path,
          file_type: uploadResult.type,
          // Removed file_size as it doesn't exist in project_outputs table schema
          user_id: user.id  // Changed from created_by to user_id to match table schema
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return transformDatabaseObject(data);
    } catch (error) {
      handleApiError(error, 'add project output');
    }
  },

  // Get project outputs
  async getProjectOutputs(projectId) {
    try {
      const { data, error } = await supabase
        .from('project_outputs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(transformDatabaseObject);
    } catch (error) {
      handleApiError(error, 'get project outputs');
    }
  },

  // Delete project output
  async deleteProjectOutput(outputId) {
    try {
      // Get output data for file cleanup
      const { data: output, error: fetchError } = await supabase
        .from('project_outputs')
        .select('file_path')
        .eq('id', outputId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Delete file from storage
      if (output.file_path) {
        await storageApi.deleteFile(storageBuckets.projectOutputs, output.file_path);
      }

      // Delete output record
      const { error } = await supabase
        .from('project_outputs')
        .delete()
        .eq('id', outputId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      handleApiError(error, 'delete project output');
    }
  },

  // Legacy golden examples methods removed - using V2 template system instead
};