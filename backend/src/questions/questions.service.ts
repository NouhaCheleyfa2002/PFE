import { Injectable } from '@nestjs/common';
import { Question } from './question.interface';

@Injectable()
export class QuestionsService {
  private readonly questions: Question[] = [
    // ── MCQ ──
    {
      id: 'q1',
      type: 'mcq',
      text: 'What is the normal ejection fraction range?',
      category: 'Cardiology',
      difficulty: 5,
      points: 2,
      options: [
        { label: 'A', text: '20–30%' },
        { label: 'B', text: '40–50%' },
        { label: 'C', text: '55–70%' },
        { label: 'D', text: '80–90%' },
      ],
      correctAnswer: 'C',
    },
    {
      id: 'q2',
      type: 'mcq',
      text: 'Which ECG finding is pathognomonic for acute MI?',
      category: 'Cardiology',
      difficulty: 7,
      points: 2,
      options: [
        { label: 'A', text: 'ST elevation' },
        { label: 'B', text: 'T-wave inversion' },
        { label: 'C', text: 'PR prolongation' },
        { label: 'D', text: 'U waves' },
      ],
      correctAnswer: 'A',
    },
    {
      id: 'q3',
      type: 'mcq',
      text: 'Which medication is first-line for hypertension in a diabetic patient?',
      category: 'Pharmacology',
      difficulty: 6,
      points: 2,
      options: [
        { label: 'A', text: 'Amlodipine' },
        { label: 'B', text: 'ACE inhibitor' },
        { label: 'C', text: 'Beta-blocker' },
        { label: 'D', text: 'Thiazide diuretic' },
      ],
      correctAnswer: 'B',
    },

    // ── True / False ──
    {
      id: 'q4',
      type: 'true_false',
      text: 'The left ventricle pumps blood to the systemic circulation.',
      category: 'Cardiology',
      difficulty: 3,
      points: 1,
      correctAnswer: 'True',
    },
    {
      id: 'q5',
      type: 'true_false',
      text: 'Insulin is produced by the alpha cells of the pancreas.',
      category: 'Endocrinology',
      difficulty: 4,
      points: 1,
      correctAnswer: 'False',
    },

    // ── Fill in the Blank ──
    {
      id: 'q6',
      type: 'fill_blank',
      text: 'The heart pumps ______ blood through ______ circulation.',
      category: 'Cardiology',
      difficulty: 4,
      points: 2,
    },
    {
      id: 'q7',
      type: 'fill_blank',
      text: 'The normal resting heart rate for adults ranges from ______ to ______ beats per minute.',
      category: 'Cardiology',
      difficulty: 3,
      points: 1,
    },

    // ── Open ──
    {
      id: 'q8',
      type: 'open',
      text: 'Describe the pathophysiology of heart failure.',
      category: 'Cardiology',
      difficulty: 8,
      points: 5,
      lines: 6,
    },
    {
      id: 'q9',
      type: 'open',
      text: 'Explain the mechanisms of action of beta-blockers and their clinical indications.',
      category: 'Pharmacology',
      difficulty: 7,
      points: 4,
      lines: 5,
    },

    // ── Match ──
    {
      id: 'q10',
      type: 'match',
      text: 'Match the cardiac condition with its primary treatment:',
      category: 'Cardiology',
      difficulty: 6,
      points: 3,
      matchPairs: [
        { left: 'Atrial fibrillation', right: 'Anticoagulation' },
        { left: 'Heart failure', right: 'ACE inhibitors' },
        { left: 'Angina pectoris', right: 'Nitrates' },
      ],
    },

    // ── Image ──
    {
      id: 'q11',
      type: 'image',
      text: 'Identify the abnormality shown in this ECG strip and describe the underlying rhythm.',
      category: 'Cardiology',
      difficulty: 8,
      points: 4,
      lines: 4,
    },

    // ── More MCQs ──
    {
      id: 'q12',
      type: 'mcq',
      text: 'Which of the following is a sign of right-sided heart failure?',
      category: 'Cardiology',
      difficulty: 5,
      points: 2,
      options: [
        { label: 'A', text: 'Pulmonary edema' },
        { label: 'B', text: 'Jugular venous distension' },
        { label: 'C', text: 'Orthopnea' },
        { label: 'D', text: 'Paroxysmal nocturnal dyspnea' },
      ],
      correctAnswer: 'B',
    },
    {
      id: 'q13',
      type: 'mcq',
      text: 'What is the most common cause of bacterial meningitis in adults?',
      category: 'Neurology',
      difficulty: 6,
      points: 2,
      options: [
        { label: 'A', text: 'Neisseria meningitidis' },
        { label: 'B', text: 'Streptococcus pneumoniae' },
        { label: 'C', text: 'Haemophilus influenzae' },
        { label: 'D', text: 'Listeria monocytogenes' },
      ],
      correctAnswer: 'B',
    },

    // ── More True/False ──
    {
      id: 'q14',
      type: 'true_false',
      text: 'Aspirin irreversibly inhibits cyclooxygenase (COX) enzymes.',
      category: 'Pharmacology',
      difficulty: 5,
      points: 1,
      correctAnswer: 'True',
    },

    // ── More Open ──
    {
      id: 'q15',
      type: 'open',
      text: 'List the causes of dilated cardiomyopathy and explain how each contributes to ventricular dysfunction.',
      category: 'Cardiology',
      difficulty: 9,
      points: 6,
      lines: 8,
    },
  ];

  findAll(search?: string, category?: string): Question[] {
    let result = [...this.questions];

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (q) =>
          q.text.toLowerCase().includes(lower) ||
          q.category.toLowerCase().includes(lower),
      );
    }

    if (category) {
      result = result.filter(
        (q) => q.category.toLowerCase() === category.toLowerCase(),
      );
    }

    return result;
  }

  findById(id: string): Question | undefined {
    return this.questions.find((q) => q.id === id);
  }

  getCategories(): string[] {
    return [...new Set(this.questions.map((q) => q.category))];
  }

  create(data: Partial<Question>): Question {
    const newQuestion: Question = {
      id: `q${Date.now()}`,
      type: data.type || 'mcq',
      text: data.text || '',
      category: data.category || '',
      difficulty: data.difficulty || 5,
      points: data.points || 2,
      level: data.level,
      imageUrl: data.imageUrl,
      imageCaption: data.imageCaption,
      options: data.options,
      correctAnswer: data.correctAnswer,
      blanks: data.blanks,
      matchPairs: data.matchPairs,
      lines: data.lines,
      imageWidth: data.imageWidth,
      imageAlign: data.imageAlign,
    };
    this.questions.push(newQuestion);
    return newQuestion;
  }

  update(id: string, data: Partial<Question>, userId: string): Question | null {
    const index = this.questions.findIndex((q) => q.id === id);
    if (index === -1) return null;

    this.questions[index] = {
      ...this.questions[index],
      ...data,
    };
    return this.questions[index];
  }

  remove(id: string, userId: string): boolean {
    const index = this.questions.findIndex((q) => q.id === id);
    if (index === -1) return false;

    this.questions.splice(index, 1);
    return true;
  }
}
