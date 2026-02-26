// Storage bucket names configuration
export const storageBuckets = {
  companyArtifacts: 'company-artifacts',
  roleArtifacts: 'role-artifacts',
  candidatePhotos: 'candidate-photos',
  candidateArtifacts: 'candidate-artifacts',
  interviewerPhotos: 'interviewer-photos',
  processArtifacts: 'process-artifacts',
  projectOutputs: 'project-outputs',
  goldenExamples: 'golden-examples'
};

// Artifact types configuration (fallback if DB is unreachable)
export const artifactTypes = {
  company: [
    { id: 'company_description', name: 'Company Description' },
    { id: 'website', name: 'Website' },
    { id: 'annual_report', name: 'Annual Report' },
    { id: 'company_10k', name: 'Company 10-K' },
    { id: 'investor_presentation', name: 'Investor Presentation' },
    { id: 'financial_report', name: 'Financial Report' },
    { id: 'company_other', name: 'Other' },
  ],
  role: [
    { id: 'role_description', name: 'Role Description' },
    { id: 'role_scorecard', name: 'Role Scorecard' },
    { id: 'competency_model', name: 'Competency Model' },
    { id: 'benchmark_profile', name: 'Benchmark Profile' },
    { id: 'role_other', name: 'Other' },
  ],
  candidate: [
    { id: 'resume_cv', name: 'Resume/CV' },
    { id: 'linkedin_profile', name: 'LinkedIn Profile' },
    { id: 'interview_transcript', name: 'Interview Transcript' },
    { id: 'reference_transcript', name: 'Reference Transcript' },
    { id: 'candidate_other', name: 'Other' },
  ],
  process: [
    { id: 'company_bio', name: 'Company Bio' },
    { id: 'process_linkedin', name: 'LinkedIn Profile' },
    { id: 'interview_feedback', name: 'Interview Feedback' },
    { id: 'process_other', name: 'Other' },
  ],
  golden: [
    { id: 'role_specification', name: 'Role Specification' },
    { id: 'company_briefing', name: 'Company Briefing' },
    { id: 'scorecard', name: 'Assessment Scorecard' },
    { id: 'confidential_report', name: 'Confidential Report' },
    { id: 'interview_guide', name: 'Interview Guide' },
    { id: 'reference_report', name: 'Reference Report' },
  ],
};