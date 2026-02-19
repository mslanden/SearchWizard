// Consolidated API exports for backward compatibility
// This allows imports like: import { artifactApi } from '../lib/api'

import { storageApi } from './storageApi';
import { candidateApi } from './candidateApi';
import { projectApi } from './projectApi';
import { interviewerApi } from './interviewerApi';

export { storageApi } from './storageApi';
export { candidateApi } from './candidateApi';
export { projectApi } from './projectApi';
export { interviewerApi } from './interviewerApi';
export { storageBuckets, artifactTypes } from './config';
export * from './utils';

// Create unified artifactApi object for backward compatibility
export const artifactApi = {
  // Storage operations
  ...storageApi,
  
  // Project operations
  ...projectApi,
  
  // Candidate operations  
  ...candidateApi,
  
  // Interviewer operations
  ...interviewerApi,
  
  // Additional methods that might be needed
  // These can be moved to appropriate modules as the refactoring continues
};