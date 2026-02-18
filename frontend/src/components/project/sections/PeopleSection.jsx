import CandidatesSection from './CandidatesSection';
import InterviewersSection from './InterviewersSection';

export default function PeopleSection({ 
  candidates, 
  interviewers, 
  onAddCandidate, 
  onEditCandidate, 
  onAddInterviewer, 
  onEditInterviewer 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <CandidatesSection
        candidates={candidates}
        onAdd={onAddCandidate}
        onEdit={onEditCandidate}
      />
      <InterviewersSection
        interviewers={interviewers}
        onAdd={onAddInterviewer}
        onEdit={onEditInterviewer}
      />
    </div>
  );
}