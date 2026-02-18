// Feature flags for controlling application features
export const features = {
  // Admin approval system - set to true once you've run the Supabase SQL setup
  adminApprovalSystem: true,
  
  // Other feature flags can be added here as needed
};

// Helper function to check if a feature is enabled
export function isFeatureEnabled(featureName) {
  return features[featureName] || false;
}