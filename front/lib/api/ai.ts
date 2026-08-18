import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// ============================================================================
// QUESTION VARIATIONS
// ============================================================================

export interface GenerateVariationRequest {
  questionId: string;
  variationType: 'easier' | 'harder' | 'scenario_based' | 'mcq' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank' | 'all';
  customInstructions?: string;
}

export interface QuestionVariation {
  id?: string;
  variationType: string;
  text: string;
  type: string;
  options?: string[];
  correctAnswer?: string;
  difficulty: string;
  explanation?: string;
}

export interface GenerateVariationResponse {
  success: boolean;
  variations: QuestionVariation[];
  originalQuestion: {
    id: string;
    text: string;
    type: string;
  };
}

export const generateQuestionVariations = async (
  data: GenerateVariationRequest
): Promise<GenerateVariationResponse> => {
  const response = await axios.post(
    `${API_URL}/ai/generate-variations`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// ============================================================================
// QUESTION IMPROVEMENT
// ============================================================================

export interface ImproveQuestionRequest {
  questionId: string;
  improvementTypes: ('fix_grammar' | 'clarify_wording' | 'increase_difficulty' | 'simplify' | 'improve_distractors' | 'reduce_ambiguity' | 'all')[];
  customInstructions?: string;
}

export interface ImproveQuestionResponse {
  success: boolean;
  questionId: string;
  originalQuestion: {
    text: string;
    type: string;
    options?: string[];
  };
  improvedQuestion: {
    text: string;
    options?: string[];
  };
  improvements: Array<{
    improvementType: string;
    changes: string[];
    reasoning: string;
  }>;
  summary: string;
}

export const improveQuestion = async (
  data: ImproveQuestionRequest
): Promise<ImproveQuestionResponse> => {
  const response = await axios.post(
    `${API_URL}/ai/improve-question`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// ============================================================================
// RUBRIC GENERATION
// ============================================================================

export interface GenerateRubricRequest {
  questionId: string;
  totalPoints?: number;
  criteria?: string[];
  customInstructions?: string;
}

export interface RubricCriterion {
  name: string;
  description: string;
  points: number;
  percentage: number;
  levels: Array<{
    level: string;
    description: string;
    pointRange: [number, number];
  }>;
}

export interface GenerateRubricResponse {
  success: boolean;
  questionId: string;
  questionText: string;
  totalPoints: number;
  criteria: RubricCriterion[];
  generatedAt: Date;
}

export const generateRubric = async (
  data: GenerateRubricRequest
): Promise<GenerateRubricResponse> => {
  const response = await axios.post(
    `${API_URL}/ai/generate-rubric`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// ============================================================================
// DOCUMENT CHAT
// ============================================================================

export interface DocumentChatRequest {
  documentId: string;
  message: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  context?: string;
}

export interface DocumentChatResponse {
  success: boolean;
  response: string;
  suggestedFollowUps?: string[];
  documentId: string;
  documentTitle: string;
  timestamp: Date;
}

export const chatWithDocument = async (
  data: DocumentChatRequest
): Promise<DocumentChatResponse> => {
  const response = await axios.post(
    `${API_URL}/ai/chat-with-document`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// ============================================================================
// QUESTION GENERATION (existing, enhanced)
// ============================================================================

export interface GenerateQuestionsRequest {
  documentId: string;
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topics?: string[];
  customInstructions?: string;
}

export interface GeneratedQuestion {
  text: string;
  options: string[] | null;
  correctAnswer: string | null;
  topic: string | null;
  difficulty: string;
  explanation: string | null;
}

export interface GenerateQuestionsResponse {
  questions: GeneratedQuestion[];
  documentId: string;
  documentTitle: string;
  generatedAt: Date;
  count: number;
}

export const generateQuestions = async (
  data: GenerateQuestionsRequest
): Promise<GenerateQuestionsResponse> => {
  const response = await axios.post(
    `${API_URL}/ai/generate-questions`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// ============================================================================
// AI EXAM GENERATOR (Full exam generation)
// ============================================================================

export interface GenerateExamRequest {
  source: 'document' | 'extracted' | 'question-bank' | 'mixed';
  documentId?: string;
  questionIds?: string[];
  totalQuestions: number;
  questionTypes: {
    mcq: boolean;
    trueFalse: boolean;
    shortAnswer: boolean;
    essay: boolean;
  };
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create' | 'mixed';
  durationMinutes: number;
  totalMarks: number;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  templateId?: string;
  examTitle?: string;
  examInstructions?: string;
}

export interface ExamQuestion {
  id: string;
  text: string;
  type: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  difficulty: string;
  bloomLevel?: string;
  topic?: string;
  explanation?: string;
}

export interface AnswerKeyItem {
  questionNumber: number;
  questionId: string;
  correctAnswer: string;
  explanation?: string;
  points: number;
}

export interface GenerateExamResponse {
  examId: string;
  title: string;
  instructions: string;
  duration: number;
  totalMarks: number;
  questions: ExamQuestion[];
  answerKey?: AnswerKeyItem[];
  markScheme?: any;
  rubrics?: any[];
  metadata: {
    source: string;
    difficulty: string;
    bloomLevel: string;
    questionTypes: Record<string, number>;
    generatedAt: Date;
  };
}

export const generateExam = async (
  data: GenerateExamRequest
): Promise<GenerateExamResponse> => {
  const response = await axios.post(
    `${API_URL}/ai/generate-exam`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};
