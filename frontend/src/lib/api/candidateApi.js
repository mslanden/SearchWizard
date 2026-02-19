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

export const candidateApi = {
  // Add a new candidate to a project
  async addCandidate(projectId, candidateData) {
    try {
      const user = await getCurrentUser();
      
      validateRequiredFields(candidateData, ['name']);

      const candidateId = uuidv4();
      let photoUrl = null;

      // Handle photo upload if provided
      if (candidateData.profilePhoto) {
        const uploadResult = await storageApi.uploadFile(
          candidateData.profilePhoto,
          storageBuckets.candidatePhotos,
          `${user.id}/project_${projectId}`
        );
        photoUrl = uploadResult.url;
      }

      // Insert candidate record
      const { data, error } = await supabase
        .from('candidates')
        .insert({
          id: candidateId,
          project_id: projectId,
          name: candidateData.name,
          role: candidateData.role || '',
          company: candidateData.company || '',
          email: candidateData.email || '',
          phone: candidateData.phone || '',
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
      handleApiError(error, 'add candidate');
    }
  },

  // Add an artifact to a candidate
  async addCandidateArtifact(candidateId, artifactData, file) {
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
          storageBuckets.candidateArtifacts,
          `${user.id}/candidate_${candidateId}`
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
        candidate_id: candidateId,
        name: artifactData.name,
        description: artifactData.description || '',
        artifact_type: artifactData.artifactType || 'other',
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
        .from('candidate_artifacts')
        .insert(artifactRecord)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Increment candidate artifact count
      await incrementCount('candidates', 'id', candidateId, 'artifacts_count');

      return transformDatabaseObject(data);
    } catch (error) {
      handleApiError(error, 'add candidate artifact');
    }
  },

  // Get all candidates for a project
  async getCandidates(projectId) {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(transformDatabaseObject);
    } catch (error) {
      handleApiError(error, 'get candidates');
    }
  },

  // Get artifacts for a specific candidate
  async getCandidateArtifacts(candidateId) {
    try {
      const { data, error } = await supabase
        .from('candidate_artifacts')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(transformDatabaseObject);
    } catch (error) {
      handleApiError(error, 'get candidate artifacts');
    }
  },

  // Update candidate information
  async updateCandidate(projectId, candidateId, updatedData) {
    try {
      const user = await getCurrentUser();
      
      let photoUrl = updatedData.photoUrl;

      // Handle photo upload if new photo provided
      if (updatedData.profilePhoto) {
        const uploadResult = await storageApi.uploadFile(
          updatedData.profilePhoto,
          storageBuckets.candidatePhotos,
          `project_${projectId}`
        );
        photoUrl = uploadResult.url;
      }

      const updateFields = {
        name: updatedData.name,
        role: updatedData.role || '',
        company: updatedData.company || '',
        email: updatedData.email || '',
        phone: updatedData.phone || '',
        updated_at: new Date().toISOString()
      };

      if (photoUrl) {
        updateFields.photo_url = photoUrl;
      }

      const { data, error } = await supabase
        .from('candidates')
        .update(updateFields)
        .eq('id', candidateId)
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return transformDatabaseObject(data);
    } catch (error) {
      handleApiError(error, 'update candidate');
    }
  },

  // Delete a candidate
  async deleteCandidate(candidateId) {
    try {
      // First get candidate data to access photo URL for cleanup
      const { data: candidate, error: fetchError } = await supabase
        .from('candidates')
        .select('photo_url')
        .eq('id', candidateId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Delete candidate artifacts first
      const { data: artifacts } = await supabase
        .from('candidate_artifacts')
        .select('file_path')
        .eq('candidate_id', candidateId);

      // Delete artifact files from storage
      if (artifacts && artifacts.length > 0) {
        for (const artifact of artifacts) {
          if (artifact.file_path) {
            await storageApi.deleteFile(storageBuckets.candidateArtifacts, artifact.file_path);
          }
        }
      }

      // Delete artifacts from database
      await supabase
        .from('candidate_artifacts')
        .delete()
        .eq('candidate_id', candidateId);

      // Delete photo from storage if exists
      if (candidate.photo_url) {
        const photoPath = candidate.photo_url.split('/').pop();
        await storageApi.deleteFile(storageBuckets.candidatePhotos, photoPath);
      }

      // Delete candidate record
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      handleApiError(error, 'delete candidate');
    }
  },

  // Delete a candidate artifact
  async deleteCandidateArtifact(artifactId) {
    try {
      // Get artifact data for file cleanup
      const { data: artifact, error: fetchError } = await supabase
        .from('candidate_artifacts')
        .select('file_path, candidate_id')
        .eq('id', artifactId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Delete file from storage
      if (artifact.file_path) {
        await storageApi.deleteFile(storageBuckets.candidateArtifacts, artifact.file_path);
      }

      // Delete artifact record
      const { error } = await supabase
        .from('candidate_artifacts')
        .delete()
        .eq('id', artifactId);

      if (error) {
        throw error;
      }

      // Decrement candidate artifact count
      await decrementCount('candidates', 'id', artifact.candidate_id, 'artifacts_count');

      return true;
    } catch (error) {
      handleApiError(error, 'delete candidate artifact');
    }
  }
};