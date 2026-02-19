import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { storageBuckets } from './config';
import { storageApi } from './storageApi';
import { 
  getCurrentUser, 
  handleApiError, 
  validateRequiredFields, 
  transformDatabaseObject,
  incrementCount,
  decrementCount
} from './utils';

export const interviewerApi = {
  // Add a process artifact to an interviewer
  async addProcessArtifact(interviewerId, artifactData, file) {
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
        
        // Upload file to storage
        uploadResult = await storageApi.uploadFile(
          file,
          storageBuckets.processArtifacts,
          `interviewer_${interviewerId}`
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
        interviewer_id: interviewerId,
        name: artifactData.name,
        description: artifactData.description || '',
        artifact_type: artifactData.artifactType || 'other',
        input_type: inputType,
        user_id: user.id,
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
        .from('process_artifacts')
        .insert(artifactRecord)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Increment interviewer artifact count
      await incrementCount('interviewers', 'id', interviewerId, 'artifacts_count');

      return transformDatabaseObject(data);
    } catch (error) {
      handleApiError(error, 'add process artifact');
    }
  },

  // Get artifacts for a specific interviewer
  async getInterviewerArtifacts(interviewerId) {
    try {
      const { data, error } = await supabase
        .from('process_artifacts')
        .select('*')
        .eq('interviewer_id', interviewerId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(transformDatabaseObject);
    } catch (error) {
      handleApiError(error, 'get interviewer artifacts');
    }
  },

  // Update interviewer information
  async updateInterviewer(projectId, interviewerId, updatedData) {
    try {
      const user = await getCurrentUser();
      
      let photoUrl = updatedData.photoUrl;

      // Handle photo upload if new photo provided
      if (updatedData.profilePhoto) {
        const uploadResult = await storageApi.uploadFile(
          updatedData.profilePhoto,
          storageBuckets.interviewerPhotos,
          `${user.id}/project_${projectId}`
        );
        photoUrl = uploadResult.url;
      }

      const updateFields = {
        name: updatedData.name,
        position: updatedData.position || updatedData.role || '',
        company: updatedData.company || '',
        email: updatedData.email || '',
        phone: updatedData.phone || '',
        updated_at: new Date().toISOString()
      };

      if (photoUrl) {
        updateFields.photo_url = photoUrl;
      }

      const { data, error } = await supabase
        .from('interviewers')
        .update(updateFields)
        .eq('id', interviewerId)
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return transformDatabaseObject(data);
    } catch (error) {
      handleApiError(error, 'update interviewer');
    }
  },

  // Get all interviewers for a project
  async getInterviewers(projectId) {
    try {
      const { data, error } = await supabase
        .from('interviewers')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(transformDatabaseObject);
    } catch (error) {
      handleApiError(error, 'get interviewers');
    }
  },

  // Add a new interviewer to a project
  async addInterviewer(projectId, interviewerData) {
    try {
      const user = await getCurrentUser();
      
      validateRequiredFields(interviewerData, ['name']);

      const interviewerId = uuidv4();
      let photoUrl = null;

      // Handle photo upload if provided
      if (interviewerData.profilePhoto) {
        const uploadResult = await storageApi.uploadFile(
          interviewerData.profilePhoto,
          storageBuckets.interviewerPhotos,
          `${user.id}/project_${projectId}`
        );
        photoUrl = uploadResult.url;
      }

      // Insert interviewer record
      const { data, error } = await supabase
        .from('interviewers')
        .insert({
          id: interviewerId,
          project_id: projectId,
          name: interviewerData.name,
          position: interviewerData.position || interviewerData.role || '',
          company: interviewerData.company || '',
          email: interviewerData.email || '',
          phone: interviewerData.phone || '',
          photo_url: photoUrl,
          user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return transformDatabaseObject(data);
    } catch (error) {
      handleApiError(error, 'add interviewer');
    }
  },

  // Delete an interviewer
  async deleteInterviewer(interviewerId) {
    try {
      // First get interviewer data to access photo URL for cleanup
      const { data: interviewer, error: fetchError } = await supabase
        .from('interviewers')
        .select('photo_url')
        .eq('id', interviewerId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Delete process artifacts first
      const { data: artifacts } = await supabase
        .from('process_artifacts')
        .select('file_path')
        .eq('interviewer_id', interviewerId);

      // Delete artifact files from storage
      if (artifacts && artifacts.length > 0) {
        for (const artifact of artifacts) {
          if (artifact.file_path) {
            await storageApi.deleteFile(storageBuckets.processArtifacts, artifact.file_path);
          }
        }
      }

      // Delete artifacts from database
      await supabase
        .from('process_artifacts')
        .delete()
        .eq('interviewer_id', interviewerId);

      // Delete photo from storage if exists
      if (interviewer.photo_url) {
        const photoPath = interviewer.photo_url.split('/').pop();
        await storageApi.deleteFile(storageBuckets.interviewerPhotos, photoPath);
      }

      // Delete interviewer record
      const { error } = await supabase
        .from('interviewers')
        .delete()
        .eq('id', interviewerId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      handleApiError(error, 'delete interviewer');
    }
  },

  // Delete a process artifact
  async deleteProcessArtifact(artifactId) {
    try {
      // Get artifact data for file cleanup
      const { data: artifact, error: fetchError } = await supabase
        .from('process_artifacts')
        .select('file_path, interviewer_id')
        .eq('id', artifactId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Delete file from storage
      if (artifact.file_path) {
        await storageApi.deleteFile(storageBuckets.processArtifacts, artifact.file_path);
      }

      // Delete artifact record
      const { error } = await supabase
        .from('process_artifacts')
        .delete()
        .eq('id', artifactId);

      if (error) {
        throw error;
      }

      // Decrement interviewer artifact count
      await decrementCount('interviewers', 'id', artifact.interviewer_id, 'artifacts_count');

      return true;
    } catch (error) {
      handleApiError(error, 'delete process artifact');
    }
  }
};