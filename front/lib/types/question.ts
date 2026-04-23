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
  difficulty: number;
  points: number;
  options?: McqOption[];
  correctAnswer?: string;
  blanks?: string[];
  imageUrl?: string;
  imageWidth?: number;
  imageAlign?: "left" | "center" | "right";
  imageCaption?: string;
  matchPairs?: MatchPair[];
  lines?: number;
}
