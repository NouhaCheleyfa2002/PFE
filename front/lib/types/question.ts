export type QuestionType =
  | 'mcq'
  | 'true_false'
  | 'fill_blank'
  | 'open'
  | 'image'
  | 'match';

export interface McqOption {
  label: string;
  text: string;
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  category: string;
  subject?: string;
  difficulty: number;
  points: number;
  level?: string;
  topic?: string; // Topic/concept covered
  explanation?: string; // Explanation for the correct answer
  options?: McqOption[];
  correctAnswer?: string;
  blanks?: string[];
  imageUrl?: string;
  imageWidth?: number;
  imageAlign?: "left" | "center" | "right";
  imageCaption?: string;
  matchPairs?: MatchPair[];
  lines?: number;
  // Collaboration metadata
  lastModifiedBy?: string;
  lastModifiedAt?: Date | string;
  createdBy?: string;
  createdAt?: Date | string;
}
