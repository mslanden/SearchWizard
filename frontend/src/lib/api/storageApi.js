import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { storageBuckets, artifactTypes } from './config';
import { getCurrentUser, handleApiError, generateUniqueFilename } from './utils';

// Storage and file operation utilities

export const storageApi = {
  // Check if a file already exists in Supabase Storage
  async checkFileExists(bucket, filePath) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(filePath.split('/').slice(0, -1).join('/'));

      if (error) {
        return false;
      }

      const fileName = filePath.split('/').pop();
      return data && data.some(file => file.name === fileName);
    } catch (err) {
      return false;
    }
  },

  // Upload a file to storage
  async uploadFile(file, bucket, folder = '') {
    try {
      const user = await getCurrentUser();
      
      if (!file) {
        throw new Error('No file provided');
      }

      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        throw new Error('File size must be less than 50MB');
      }

      // Generate unique filename
      const filename = generateUniqueFilename(file.name, user.id);
      const filePath = folder ? `${folder}/${filename}` : filename;

      // Check if file already exists
      const exists = await this.checkFileExists(bucket, filePath);
      if (exists) {
        throw new Error('A file with this name already exists');
      }

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get signed URL for private buckets, fallback to public URL
      let fileUrl;
      try {
        // Try to create a signed URL (for private buckets)
        const { data: signedData, error: signedError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 3600); // 1 hour expiry
        
        if (signedError) {
          // Fallback to public URL if signing fails
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
          fileUrl = urlData.publicUrl;
        } else {
          fileUrl = signedData.signedUrl;
        }
      } catch (e) {
        // Fallback to public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      }

      return {
        path: data.path,
        fullPath: data.fullPath,
        url: fileUrl,
        filename: filename,
        originalName: file.name,
        size: file.size,
        type: file.type
      };
    } catch (error) {
      handleApiError(error, 'upload file');
    }
  },

  // Delete a file from storage
  async deleteFile(bucket, filePath) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      handleApiError(error, 'delete file');
    }
  },

  // Process URL content via backend
  async processUrlContent(url, artifactType = null) {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://searchwizard-production.up.railway.app';
      
      console.log('Processing URL:', url);
      console.log('Backend URL:', backendUrl);
      
      const response = await fetch(`${backendUrl}/process-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_type: 'url',
          content: url,
          artifact_type: artifactType
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend error:', errorData);
        throw new Error(errorData.detail || 'Failed to process URL content');
      }

      const result = await response.json();
      console.log('Backend result:', result);
      
      return {
        processedContent: result.processed_content,
        metadata: result.metadata
      };
    } catch (error) {
      console.error('Error in processUrlContent:', error);
      handleApiError(error, 'process URL content');
    }
  },


  // Get artifact types with fallback to predefined types
  async getArtifactTypes(category) {
    try {
      // First try to get custom types from database
      const { data, error } = await supabase
        .from('artifact_types')
        .select('*')
        .eq('category', category)
        .order('name');

      if (error && error.code !== 'PGRST116') { // PGRST116 = table not found
        throw error;
      }

      // If we have custom types, return them
      if (data && data.length > 0) {
        return data.map(type => ({
          id: type.id || type.type_id,
          name: type.name,
          category: type.category,
          description: type.description
        }));
      }

      // Fallback to predefined types
      return artifactTypes[category] || [];
    } catch (error) {
      // If database fails, return predefined types
      return artifactTypes[category] || [];
    }
  },

  // Add a new artifact type
  async addArtifactType(category, name, description = '') {
    try {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('artifact_types')
        .insert({
          id: uuidv4(),
          category,
          name,
          description,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        category: data.category,
        description: data.description
      };
    } catch (error) {
      handleApiError(error, 'add artifact type');
    }
  },

  // Get storage buckets configuration
  getBuckets() {
    return storageBuckets;
  },

  // Get predefined artifact types
  getPredefinedTypes() {
    return artifactTypes;
  }
};