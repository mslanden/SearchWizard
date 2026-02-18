import { useReducer, useCallback } from 'react';
import { Project, ProjectState, ProjectAction, Artifact, Candidate, Interviewer } from '../types/project';

const initialState: ProjectState = {
  project: null,
  loading: false,
  error: null,
  deletingDocument: false,
  selectedOutputs: []
};

const projectReducer = (state: ProjectState, action: ProjectAction): ProjectState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'SET_PROJECT':
      return { 
        ...state, 
        project: action.payload, 
        loading: false, 
        error: null 
      };

    case 'ADD_ARTIFACT':
      if (!state.project) return state;
      return {
        ...state,
        project: {
          ...state.project,
          artifacts: [...state.project.artifacts, action.payload],
          artifactCount: state.project.artifacts.length + 1
        }
      };

    case 'DELETE_ARTIFACT':
      if (!state.project) return state;
      return {
        ...state,
        project: {
          ...state.project,
          artifacts: state.project.artifacts.filter(a => a.id !== action.payload),
          artifactCount: state.project.artifacts.length - 1
        }
      };

    case 'ADD_CANDIDATE':
      if (!state.project) return state;
      return {
        ...state,
        project: {
          ...state.project,
          candidates: [...state.project.candidates, action.payload]
        }
      };

    case 'UPDATE_CANDIDATE':
      if (!state.project) return state;
      return {
        ...state,
        project: {
          ...state.project,
          candidates: state.project.candidates.map(c => 
            c.id === action.payload.id ? { ...c, ...action.payload } : c
          )
        }
      };

    case 'ADD_INTERVIEWER':
      if (!state.project) return state;
      return {
        ...state,
        project: {
          ...state.project,
          interviewers: [...state.project.interviewers, action.payload]
        }
      };

    case 'UPDATE_INTERVIEWER':
      if (!state.project) return state;
      return {
        ...state,
        project: {
          ...state.project,
          interviewers: state.project.interviewers.map(i => 
            i.id === action.payload.id ? { ...i, ...action.payload } : i
          )
        }
      };

    case 'DELETE_OUTPUT':
      if (!state.project) return state;
      return {
        ...state,
        project: {
          ...state.project,
          outputs: state.project.outputs.filter(o => o.id !== action.payload)
        }
      };

    case 'TOGGLE_OUTPUT_SELECTION':
      return {
        ...state,
        selectedOutputs: state.selectedOutputs.includes(action.payload)
          ? state.selectedOutputs.filter(id => id !== action.payload)
          : [...state.selectedOutputs, action.payload]
      };

    case 'SET_DELETING_DOCUMENT':
      return { ...state, deletingDocument: action.payload };

    default:
      return state;
  }
};

export const useProjectReducer = () => {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  const actions = {
    setLoading: useCallback((loading: boolean) => 
      dispatch({ type: 'SET_LOADING', payload: loading }), []),

    setError: useCallback((error: string | null) => 
      dispatch({ type: 'SET_ERROR', payload: error }), []),

    setProject: useCallback((project: Project) => 
      dispatch({ type: 'SET_PROJECT', payload: project }), []),

    addArtifact: useCallback((artifact: Artifact) => 
      dispatch({ type: 'ADD_ARTIFACT', payload: artifact }), []),

    deleteArtifact: useCallback((artifactId: string) => 
      dispatch({ type: 'DELETE_ARTIFACT', payload: artifactId }), []),

    addCandidate: useCallback((candidate: Candidate) => 
      dispatch({ type: 'ADD_CANDIDATE', payload: candidate }), []),

    updateCandidate: useCallback((candidate: Candidate) => 
      dispatch({ type: 'UPDATE_CANDIDATE', payload: candidate }), []),

    addInterviewer: useCallback((interviewer: Interviewer) => 
      dispatch({ type: 'ADD_INTERVIEWER', payload: interviewer }), []),

    updateInterviewer: useCallback((interviewer: Interviewer) => 
      dispatch({ type: 'UPDATE_INTERVIEWER', payload: interviewer }), []),

    deleteOutput: useCallback((outputId: string) => 
      dispatch({ type: 'DELETE_OUTPUT', payload: outputId }), []),

    toggleOutputSelection: useCallback((outputId: string) => 
      dispatch({ type: 'TOGGLE_OUTPUT_SELECTION', payload: outputId }), []),

    setDeletingDocument: useCallback((documentId: string | false) => 
      dispatch({ type: 'SET_DELETING_DOCUMENT', payload: documentId }), [])
  };

  return { state, actions };
};