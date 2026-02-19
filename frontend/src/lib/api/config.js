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

// Artifact types configuration
export const artifactTypes = {
  company: [
    { id: 'annual_report', name: 'Annual Report' },
    { id: 'investor_deck', name: 'Investor Deck' },
    { id: 'company_website', name: 'Company Website' },
    { id: 'company_description', name: 'Company Description' },
    { id: 'press_release', name: 'Press Release/News' },
    { id: 'wikipedia', name: 'Wikipedia Page' },
    { id: 'crunchbase', name: 'Crunchbase Profile' },
    { id: 'analyst_report', name: 'Analyst Report' },
    { id: 'glassdoor', name: 'Glassdoor Reviews' },
    { id: 'other', name: 'Other' },
  ],
  role: [
    { id: 'role_description', name: 'Role Description' },
    { id: 'key_requirements', name: 'Key Requirements' },
    { id: 'screening_criteria', name: 'Screening Criteria' },
    { id: 'hiring_manager_profile', name: 'Hiring Manager Profile' },
    { id: 'benchmark_profiles', name: 'Benchmark Profiles' },
    { id: 'other', name: 'Other' },
  ],
  candidate: [
    { id: 'resume', name: 'Resume/CV' },
    { id: 'linkedin', name: 'LinkedIn Profile' },
    { id: 'interview_notes', name: 'Interview Notes/Transcripts' },
    { id: 'references', name: 'Reference Comments' },
    { id: 'recruiter_notes', name: 'Recruiter Perspective' },
    { id: 'psychometrics', name: 'Psychometrics' },
    { id: 'other', name: 'Other' },
  ],
  process: [
    { id: 'biography', name: 'Biography' },
    { id: 'contact_info', name: 'Contact Information' },
    { id: 'linkedin', name: 'LinkedIn Profile' },
    { id: 'other', name: 'Other' },
  ],
  output: [
    { id: 'role_specification', name: 'Role Specification' },
    { id: 'company_briefing', name: 'Company Briefing Document' },
    { id: 'assessment_scorecard', name: 'Assessment Scorecard' },
    { id: 'interview_tracking', name: 'Interview Tracking Table' },
    { id: 'candidate_report', name: 'Candidate Report' },
    { id: 'other', name: 'Other' },
  ],
  golden: [
    { id: 'role_specification', name: 'Role Specification' },
    { id: 'company_briefing', name: 'Company Briefing Document' },
    { id: 'assessment_scorecard', name: 'Assessment Scorecard' },
    { id: 'interview_tracking', name: 'Interview Tracking Table' },
    { id: 'candidate_report', name: 'Candidate Report' },
    { id: 'other', name: 'Other' },
  ],
};