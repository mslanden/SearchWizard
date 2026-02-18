/**
 * Input validation utilities for frontend forms
 * Provides comprehensive validation for all user inputs
 */

// Email validation regex
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// Phone validation regex (supports various formats)
const PHONE_REGEX = /^[\d\s()+-]+$/;

// URL validation regex
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  document: 52428800, // 50MB
  image: 10485760,    // 10MB
  default: 52428800   // 50MB
};

// Allowed file types by category
const ALLOWED_FILE_TYPES = {
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/html'
  ],
  presentations: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  all: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/html',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
};

// Validation functions
export const validators = {
  // Required field validation
  required: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },

  // Email validation
  email: (value) => {
    if (!value) return null; // Use required validator for required check
    if (!EMAIL_REGEX.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  // Phone validation
  phone: (value) => {
    if (!value) return null; // Use required validator for required check
    const cleaned = value.replace(/\s/g, '');
    if (cleaned.length < 10 || !PHONE_REGEX.test(value)) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  // URL validation
  url: (value) => {
    if (!value) return null; // Use required validator for required check
    if (!URL_REGEX.test(value)) {
      return 'Please enter a valid URL starting with http:// or https://';
    }
    return null;
  },

  // String length validation
  minLength: (min) => (value) => {
    if (!value) return null; // Use required validator for required check
    if (value.length < min) {
      return `Must be at least ${min} characters long`;
    }
    return null;
  },

  maxLength: (max) => (value) => {
    if (!value) return null;
    if (value.length > max) {
      return `Must be no more than ${max} characters long`;
    }
    return null;
  },

  // Password validation
  password: (value) => {
    if (!value) return null; // Use required validator for required check
    const errors = [];
    
    if (value.length < 8) {
      errors.push('at least 8 characters');
    }
    if (!/[A-Z]/.test(value)) {
      errors.push('one uppercase letter');
    }
    if (!/[a-z]/.test(value)) {
      errors.push('one lowercase letter');
    }
    if (!/[0-9]/.test(value)) {
      errors.push('one number');
    }
    
    if (errors.length > 0) {
      return `Password must contain ${errors.join(', ')}`;
    }
    return null;
  },

  // File validation
  file: (file, options = {}) => {
    if (!file) return null; // Use required validator for required check

    const {
      maxSize = FILE_SIZE_LIMITS.default,
      allowedTypes = ALLOWED_FILE_TYPES.all,
      category = 'all'
    } = options;

    // Check file size
    if (file.size > maxSize) {
      const sizeMB = Math.round(maxSize / 1048576);
      return `File size must be less than ${sizeMB}MB`;
    }

    // Check file type
    const fileTypes = Array.isArray(allowedTypes) ? allowedTypes : ALLOWED_FILE_TYPES[category];
    if (!fileTypes.includes(file.type)) {
      return `File type not allowed. Accepted types: ${getAcceptedExtensions(fileTypes).join(', ')}`;
    }

    // Additional security checks
    const fileName = file.name.toLowerCase();
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
    if (suspiciousExtensions.some(ext => fileName.endsWith(ext))) {
      return 'This file type is not allowed for security reasons';
    }

    return null;
  },

  // Multiple files validation
  files: (files, options = {}) => {
    if (!files || files.length === 0) return null;

    const { maxFiles = 10, maxTotalSize = 104857600 } = options; // 100MB total default

    if (files.length > maxFiles) {
      return `You can upload a maximum of ${maxFiles} files at once`;
    }

    let totalSize = 0;
    for (const file of files) {
      const error = validators.file(file, options);
      if (error) return error;
      totalSize += file.size;
    }

    if (totalSize > maxTotalSize) {
      const sizeMB = Math.round(maxTotalSize / 1048576);
      return `Total file size must be less than ${sizeMB}MB`;
    }

    return null;
  },

  // Custom regex validation
  pattern: (pattern, message) => (value) => {
    if (!value) return null;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    if (!regex.test(value)) {
      return message || 'Invalid format';
    }
    return null;
  },

  // Alphanumeric validation
  alphanumeric: (value) => {
    if (!value) return null;
    if (!/^[a-zA-Z0-9]+$/.test(value)) {
      return 'Only letters and numbers are allowed';
    }
    return null;
  },

  // No special characters (allows spaces)
  noSpecialChars: (value) => {
    if (!value) return null;
    if (!/^[a-zA-Z0-9\s]+$/.test(value)) {
      return 'Special characters are not allowed';
    }
    return null;
  }
};

// Helper function to get accepted file extensions
function getAcceptedExtensions(mimeTypes) {
  const extensions = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'text/plain': 'TXT',
    'text/html': 'HTML',
    'application/vnd.ms-powerpoint': 'PPT',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/webp': 'WEBP'
  };

  return mimeTypes.map(type => extensions[type] || type).filter(Boolean);
}

// Sanitization functions
export const sanitizers = {
  // Remove HTML tags
  stripHtml: (value) => {
    if (!value) return value;
    return value.replace(/<[^>]*>/g, '');
  },

  // Trim whitespace
  trim: (value) => {
    if (!value || typeof value !== 'string') return value;
    return value.trim();
  },

  // Escape HTML special characters
  escapeHtml: (value) => {
    if (!value) return value;
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return value.replace(/[&<>"']/g, char => map[char]);
  },

  // Normalize whitespace
  normalizeWhitespace: (value) => {
    if (!value) return value;
    return value.replace(/\s+/g, ' ').trim();
  },

  // Remove non-printable characters
  removeNonPrintable: (value) => {
    if (!value) return value;
    return value.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  },

  // Sanitize file name
  fileName: (value) => {
    if (!value) return value;
    // Remove directory traversal attempts and special characters
    return value
      .replace(/[\/\\]/g, '_')
      .replace(/\.{2,}/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 255); // Limit length
  }
};

// Form validation helper
export const validateForm = (formData, validationRules) => {
  const errors = {};
  
  Object.keys(validationRules).forEach(fieldName => {
    const value = formData[fieldName];
    const rules = validationRules[fieldName];
    
    // Rules can be a single validator or an array of validators
    const validators = Array.isArray(rules) ? rules : [rules];
    
    for (const validator of validators) {
      const error = typeof validator === 'function' ? validator(value) : null;
      if (error) {
        errors[fieldName] = error;
        break; // Stop at first error for this field
      }
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Composite validators for common scenarios
export const commonValidators = {
  projectName: [
    validators.required,
    validators.minLength(3),
    validators.maxLength(100),
    validators.noSpecialChars
  ],
  
  clientName: [
    validators.required,
    validators.minLength(2),
    validators.maxLength(100)
  ],
  
  personName: [
    validators.required,
    validators.minLength(2),
    validators.maxLength(100),
    validators.pattern(/^[a-zA-Z\s'-]+$/, 'Please enter a valid name')
  ],
  
  email: [
    validators.required,
    validators.email
  ],
  
  optionalEmail: [
    validators.email
  ],
  
  phone: [
    validators.phone
  ],
  
  password: [
    validators.required,
    validators.password
  ],
  
  description: [
    validators.maxLength(500)
  ],
  
  documentFile: (required = true) => {
    const rules = [
      (file) => validators.file(file, {
        maxSize: FILE_SIZE_LIMITS.document,
        category: 'documents'
      })
    ];
    if (required) rules.unshift(validators.required);
    return rules;
  },
  
  imageFile: (required = true) => {
    const rules = [
      (file) => validators.file(file, {
        maxSize: FILE_SIZE_LIMITS.image,
        category: 'images'
      })
    ];
    if (required) rules.unshift(validators.required);
    return rules;
  }
};

// Export constants
export { FILE_SIZE_LIMITS, ALLOWED_FILE_TYPES };