import { supabase } from '../supabase';

// Common utility functions for API operations

// Format database field names to frontend expectations
export const formatFieldMapping = {
  // Database field -> Frontend field
  'artifact_count': 'artifactCount',
  'background_color': 'backgroundColor',
  'photo_url': 'photoUrl',
  'artifact_type': 'artifactType',
  'date_added': 'dateAdded',
  'file_url': 'fileUrl',
  'file_type': 'fileType',
  'file_size': 'fileSize',
  'created_at': 'dateCreated',  // Map created_at to dateCreated for project outputs
  'date_generated': 'dateCreated',  // Also map date_generated to dateCreated
  'updated_at': 'updatedAt',
  'output_type': 'type'  // Map output_type to type
};

// Transform database object to frontend format
export const transformDatabaseObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const transformed = {};
  for (const [key, value] of Object.entries(obj)) {
    const frontendKey = formatFieldMapping[key] || key;
    
    // Special handling for date fields
    if ((key === 'created_at' || key === 'date_generated' || key === 'date_added') && value) {
      try {
        const date = new Date(value);
        const formattedDate = date.toLocaleDateString();
        console.log(`Date transformation: ${key} = ${value} -> ${formattedDate}`);
        transformed[frontendKey] = formattedDate;
      } catch (e) {
        console.error(`Date transformation error for ${key}:`, e);
        transformed[frontendKey] = 'Invalid Date';
      }
    } else {
      transformed[frontendKey] = value;
    }
  }
  return transformed;
};

// Transform frontend object to database format
export const transformToDatabase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const transformed = {};
  for (const [key, value] of Object.entries(obj)) {
    // Find database key for frontend key
    const dbKey = Object.keys(formatFieldMapping).find(k => formatFieldMapping[k] === key) || key;
    transformed[dbKey] = value;
  }
  return transformed;
};

// Get current authenticated user with session validation
export const getCurrentUser = async () => {
  // First try to get the session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('Session error in getCurrentUser:', sessionError);
    throw new Error('Authentication required');
  }
  
  if (!session) {
    console.error('No session found in getCurrentUser');
    throw new Error('User not authenticated');
  }
  
  // Refresh the session if it's close to expiring
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at || 0;
  
  if (expiresAt - now < 300) { // Less than 5 minutes left
    console.log('Session close to expiring, refreshing...');
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('Session refresh error:', refreshError);
      throw new Error('Session expired, please sign in again');
    }
    
    if (refreshedSession) {
      return refreshedSession.user;
    }
  }
  
  return session.user;
};

// Standard error handler for API operations
export const handleApiError = (error, operation) => {
  
  if (error.message?.includes('auth')) {
    throw new Error('Authentication required');
  }
  
  if (error.message?.includes('permission')) {
    throw new Error('Permission denied');
  }
  
  throw new Error(error.message || `Failed to ${operation}`);
};

// Validate required fields
export const validateRequiredFields = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};

// Generate unique filename
export const generateUniqueFilename = (originalName, userId) => {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_');
  // Don't add userId prefix here since it's handled by the folder parameter
  return `${timestamp}_${sanitized}.${extension}`;
};

// Format date for display
export const formatDisplayDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Increment count helper
export const incrementCount = async (table, idField, id, countField) => {
  try {
    // First get current count, then increment
    const { data: currentData, error: fetchError } = await supabase
      .from(table)
      .select(countField)
      .eq(idField, id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const currentCount = currentData[countField] || 0;
    const { error } = await supabase
      .from(table)
      .update({
        [countField]: currentCount + 1
      })
      .eq(idField, id);

    if (error) {
      throw error;
    }
  } catch (err) {
    throw err;
  }
};

// Decrement count helper  
export const decrementCount = async (table, idField, id, countField) => {
  try {
    // First get current count, then decrement (ensuring it doesn't go below 0)
    const { data: currentData, error: fetchError } = await supabase
      .from(table)
      .select(countField)
      .eq(idField, id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const currentCount = currentData[countField] || 0;
    const newCount = Math.max(0, currentCount - 1);
    
    const { error } = await supabase
      .from(table)
      .update({
        [countField]: newCount
      })
      .eq(idField, id);

    if (error) {
      throw error;
    }
  } catch (err) {
    throw err;
  }
};