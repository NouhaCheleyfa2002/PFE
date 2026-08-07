/**
 * Tunisian Education System Configuration
 * Complete academic levels and their corresponding subjects
 */

export type EducationLevel = 
  | "1st Primary Year"
  | "2nd Primary Year"
  | "3rd Primary Year"
  | "4th Primary Year"
  | "5th Primary Year"
  | "6th Primary Year"
  | "7th Basic Education"
  | "8th Basic Education"
  | "9th Basic Education"
  | "1st Secondary"
  | "2nd Secondary"
  | "3rd Secondary"
  | "Bac";

export type BacSection = "svt" | "math" | "technique" | "info" | "lettres" | "sport" | "economie";

export const BAC_SECTIONS: { id: BacSection; name: string; description: string }[] = [
  { id: "svt", name: "Sciences Expérimentales (SVT)", description: "Biology, Geology, Physics, Chemistry" },
  { id: "math", name: "Mathématiques", description: "Mathematics, Physics, Sciences" },
  { id: "technique", name: "Sciences Techniques", description: "Engineering, Mechanics, Electrical" },
  { id: "info", name: "Sciences Informatiques", description: "Programming, Algorithms, Databases" },
  { id: "economie", name: "Économie & Gestion", description: "Economics, Accounting, Management, Statistics" },
  { id: "lettres", name: "Lettres", description: "Philosophy, Literature, History, Geography" },
  { id: "sport", name: "Sport", description: "Sports Theory, Practice, Biology" },
];

export type ResourceType = "Course Material" | "Exam";

export interface SubjectConfig {
  id: string;
  name: string;
  levels: EducationLevel[];
}

export interface DocumentTypeConfig {
  id: string;
  name: string;
  description: string;
  levels: EducationLevel[];
}

// Tunisian Education Levels in order
export const EDUCATION_LEVELS: EducationLevel[] = [
  "1st Primary Year",
  "2nd Primary Year",
  "3rd Primary Year",
  "4th Primary Year",
  "5th Primary Year",
  "6th Primary Year",
  "7th Basic Education",
  "8th Basic Education",
  "9th Basic Education",
  "1st Secondary",
  "2nd Secondary",
  "3rd Secondary",
  "Bac",
];

// Level groups for easier management
export const LEVEL_GROUPS = {
  primary: [
    "1st Primary Year",
    "2nd Primary Year",
    "3rd Primary Year",
    "4th Primary Year",
    "5th Primary Year",
    "6th Primary Year",
  ] as EducationLevel[],
  basicEducation: [
    "7th Basic Education",
    "8th Basic Education",
    "9th Basic Education",
  ] as EducationLevel[],
  secondary: [
    "1st Secondary",
    "2nd Secondary",
    "3rd Secondary",
    "Bac",
  ] as EducationLevel[],
};

// Primary School Subjects (1st - 6th Primary)
const PRIMARY_SUBJECTS: SubjectConfig[] = [
  {
    id: "arabic",
    name: "Arabic Language",
    levels: LEVEL_GROUPS.primary,
  },
  {
    id: "french",
    name: "French Language",
    levels: LEVEL_GROUPS.primary,
  },
  {
    id: "math-primary",
    name: "Mathematics",
    levels: LEVEL_GROUPS.primary,
  },
  {
    id: "science-primary",
    name: "Science & Technology",
    levels: LEVEL_GROUPS.primary,
  },
  {
    id: "islamic",
    name: "Islamic Education",
    levels: LEVEL_GROUPS.primary,
  },
  {
    id: "civics-primary",
    name: "Civic Education",
    levels: LEVEL_GROUPS.primary,
  },
  {
    id: "history-geo-primary",
    name: "History & Geography",
    levels: ["5th Primary Year", "6th Primary Year"],
  },
  {
    id: "arts-primary",
    name: "Arts & Music",
    levels: LEVEL_GROUPS.primary,
  },
  {
    id: "sports-primary",
    name: "Physical Education",
    levels: LEVEL_GROUPS.primary,
  },
];

// Basic Education Subjects (7th - 9th)
const BASIC_EDUCATION_SUBJECTS: SubjectConfig[] = [
  {
    id: "arabic-be",
    name: "Arabic Language",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "french-be",
    name: "French Language",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "english-be",
    name: "English Language",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "math-be",
    name: "Mathematics",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "physics-be",
    name: "Physical Sciences",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "life-sciences-be",
    name: "Life & Earth Sciences",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "technology-be",
    name: "Technology",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "history-be",
    name: "History",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "geography-be",
    name: "Geography",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "islamic-be",
    name: "Islamic Education",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "civics-be",
    name: "Civic Education",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "computer-be",
    name: "Computer Science",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "arts-be",
    name: "Arts & Music",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "sports-be",
    name: "Physical Education",
    levels: LEVEL_GROUPS.basicEducation,
  },
];

// Secondary School Subjects (1st Secondary - Bac)
const SECONDARY_SUBJECTS: SubjectConfig[] = [
  {
    id: "arabic-sec",
    name: "Arabic Language & Literature",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "french-sec",
    name: "French Language",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "english-sec",
    name: "English Language",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "math-sec",
    name: "Mathematics",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "physics-sec",
    name: "Physics",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "chemistry-sec",
    name: "Chemistry",
    levels: ["2nd Secondary", "3rd Secondary", "Bac"],
  },
  {
    id: "life-sciences-sec",
    name: "Life & Earth Sciences (SVT)",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "computer-sec",
    name: "Computer Science",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "philosophy",
    name: "Philosophy",
    levels: ["3rd Secondary", "Bac"],
  },
  {
    id: "history-sec",
    name: "History",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "geography-sec",
    name: "Geography",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "economics",
    name: "Economics & Management",
    levels: ["2nd Secondary", "3rd Secondary", "Bac"],
  },
  {
    id: "islamic-sec",
    name: "Islamic Thought",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "german",
    name: "German Language",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "spanish",
    name: "Spanish Language",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "italian",
    name: "Italian Language",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "sports-sec",
    name: "Physical Education",
    levels: LEVEL_GROUPS.secondary,
  },
];

// All subjects combined
export const ALL_SUBJECTS: SubjectConfig[] = [
  ...PRIMARY_SUBJECTS,
  ...BASIC_EDUCATION_SUBJECTS,
  ...SECONDARY_SUBJECTS,
];

// Document types by level
const PRIMARY_DOC_TYPES: DocumentTypeConfig[] = [
  {
    id: "lesson",
    name: "Lesson",
    description: "Complete lesson with explanations",
    levels: LEVEL_GROUPS.primary,
  },
  {
    id: "exercises",
    name: "Exercises",
    description: "Practice exercises",
    levels: LEVEL_GROUPS.primary,
  },
  {
    id: "homework",
    name: "Homework",
    description: "Homework assignments",
    levels: LEVEL_GROUPS.primary,
  },
  {
    id: "quiz",
    name: "Quiz",
    description: "Short assessment quiz",
    levels: LEVEL_GROUPS.primary,
  },
  {
    id: "summary",
    name: "Summary",
    description: "Chapter or lesson summary",
    levels: LEVEL_GROUPS.primary,
  },
];

const BASIC_DOC_TYPES: DocumentTypeConfig[] = [
  {
    id: "course-notes",
    name: "Course Notes",
    description: "Complete course notes",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "exercises-be",
    name: "Exercises",
    description: "Practice problems and exercises",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "exam-be",
    name: "Exam",
    description: "Past exam papers",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "correction",
    name: "Exam Correction",
    description: "Detailed exam solutions",
    levels: LEVEL_GROUPS.basicEducation,
  },
  {
    id: "summary-be",
    name: "Summary",
    description: "Chapter summary",
    levels: LEVEL_GROUPS.basicEducation,
  },
];

const SECONDARY_DOC_TYPES: DocumentTypeConfig[] = [
  {
    id: "course-sec",
    name: "Course",
    description: "Complete course material",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "exercises-sec",
    name: "Exercises",
    description: "Practice exercises with solutions",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "exam-sec",
    name: "Exam",
    description: "Past exam papers",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "bac-exam",
    name: "Bac Exam",
    description: "Baccalauréat exam papers",
    levels: ["Bac"],
  },
  {
    id: "correction-sec",
    name: "Correction",
    description: "Detailed exam corrections",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "summary-sec",
    name: "Summary Sheet",
    description: "Condensed course summary",
    levels: LEVEL_GROUPS.secondary,
  },
  {
    id: "project",
    name: "Project",
    description: "Student project or research",
    levels: ["2nd Secondary", "3rd Secondary", "Bac"],
  },
];

// All document types
export const ALL_DOCUMENT_TYPES: DocumentTypeConfig[] = [
  ...PRIMARY_DOC_TYPES,
  ...BASIC_DOC_TYPES,
  ...SECONDARY_DOC_TYPES,
];

/**
 * Get subjects for a specific education level
 */
export function getSubjectsForLevel(level: EducationLevel): SubjectConfig[] {
  return ALL_SUBJECTS.filter((subject) => subject.levels.includes(level));
}

/**
 * Get document types for a specific education level
 */
export function getDocumentTypesForLevel(level: EducationLevel): DocumentTypeConfig[] {
  return ALL_DOCUMENT_TYPES.filter((docType) => docType.levels.includes(level));
}

/**
 * Get level group (primary, basic, secondary)
 */
export function getLevelGroup(level: EducationLevel): 'primary' | 'basicEducation' | 'secondary' | null {
  if (LEVEL_GROUPS.primary.includes(level)) return 'primary';
  if (LEVEL_GROUPS.basicEducation.includes(level)) return 'basicEducation';
  if (LEVEL_GROUPS.secondary.includes(level)) return 'secondary';
  return null;
}

/**
 * Check if level requires Bac section selection (3rd Secondary or Bac)
 */
export function requiresBacSection(level: EducationLevel): boolean {
  return level === "3rd Secondary" || level === "Bac";
}

/**
 * Get subjects for Bac section
 */
export function getSubjectsForBacSection(level: EducationLevel, section: BacSection): SubjectConfig[] {
  const sectionSubjects: Record<BacSection, string[]> = {
    svt: ["SVT", "Physics", "Chemistry", "Mathematics"],
    math: ["Mathematics", "Physics", "Sciences", "Computer Science"],
    technique: ["Mechanical Engineering", "Electrical Engineering", "Civil Engineering", "Mathematics", "Physics"],
    info: ["Programming", "Algorithms", "Databases", "Computer Networks", "Mathematics", "Physics"],
    economie: ["Economics", "Accounting", "Management", "Statistics", "Mathematics", "Business Law"],
    lettres: ["Philosophy", "Arabic Literature", "French Literature", "History", "Geography", "English"],
    sport: ["Sports Theory", "Sports Practice", "SVT", "Mathematics"],
  };

  const commonSubjects = ["Arabic", "French", "English", "Islamic Education", "Philosophy"];
  const optionalSubjects = ["German (Optional)", "Italian (Optional)", "Spanish (Optional)", "Music (Optional)", "Arts (Optional)"];

  const sectionSpecific = sectionSubjects[section];
  const allSubjects = [...sectionSpecific, ...commonSubjects, ...optionalSubjects];

  // Remove duplicates by creating a Set
  const uniqueSubjects = Array.from(new Set(allSubjects));

  return uniqueSubjects.map((name, idx) => ({
    id: `${section}_${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
    levels: [level],
  }));
}

/**
 * Check if a subject is available for a level
 */
export function isSubjectAvailableForLevel(subjectId: string, level: EducationLevel): boolean {
  const subject = ALL_SUBJECTS.find(s => s.id === subjectId);
  return subject ? subject.levels.includes(level) : false;
}

/**
 * Check if a document type is available for a level
 */
export function isDocumentTypeAvailableForLevel(typeId: string, level: EducationLevel): boolean {
  const docType = ALL_DOCUMENT_TYPES.find(t => t.id === typeId);
  return docType ? docType.levels.includes(level) : false;
}

// Question type tooltips for exam builder
export const QUESTION_TYPE_TOOLTIPS = {
  "multiple-choice": {
    title: "Multiple Choice (MCQ)",
    description: "Students select one correct answer from multiple options. Best for testing knowledge recall and comprehension.",
  },
  "true-false": {
    title: "True/False",
    description: "Students determine if a statement is true or false. Quick assessment of understanding basic concepts.",
  },
  "short-answer": {
    title: "Short Answer",
    description: "Students provide brief written responses. Tests ability to explain concepts in their own words.",
  },
  "essay": {
    title: "Essay",
    description: "Students write detailed responses. Evaluates critical thinking, analysis, and writing skills.",
  },
  "fill-blank": {
    title: "Fill in the Blank",
    description: "Students complete sentences with missing words. Tests specific knowledge and vocabulary.",
  },
  "matching": {
    title: "Matching",
    description: "Students match items from two lists. Good for testing relationships and associations.",
  },
};
