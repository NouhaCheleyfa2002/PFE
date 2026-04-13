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
  difficulty: number;      // 1-10
  points: number;
  options?: McqOption[];    // mcq
  correctAnswer?: string;  // mcq / true_false
  blanks?: string[];        // fill_blank – text with ___
  imageUrl?: string;        // image-based
  matchPairs?: MatchPair[]; // match
  lines?: number;           // open – number of answer lines
}
