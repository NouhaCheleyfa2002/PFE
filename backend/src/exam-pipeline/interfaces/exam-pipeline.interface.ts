export interface ParsedQuestion {
  id: string;
  text: string;
  options?: string[];
  correctAnswer?: string;
  topic?: string;
  difficulty?: string;
  explanation?: string;
}

export interface PipelineResult {
  success: boolean;
  documentId: string;
  questionsExtracted: number;
  questionsStored: number;
  errors: string[];
  processingTimeMs: number;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface SemanticSearchResult {
  question: {
    id: string;
    text: string;
    options: string[] | null;
    correctAnswer: string | null;
    topic: string | null;
    difficulty: string | null;
    explanation: string | null;
    documentId: string;
  };
  similarity: number;
}
