"use client";

import { useState, useEffect } from 'react';
import { X, Sparkles, FileText, Database, Shuffle, Clock, Award, Brain, Loader2, CheckCircle, Upload, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateExam, type GenerateExamRequest } from '@/lib/api/ai';
import { authService } from '@/lib/auth';

interface AIExamGeneratorWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onExamGenerated: (exam: any) => void;
}

type QuestionSource = 'document' | 'extracted' | 'question-bank' | 'mixed';
type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create' | 'mixed';

interface Document {
  id: string;
  title: string;
  subject?: string;
  level?: string;
  resourceType?: string;
}

interface Question {
  id: string;
  text: string;
  type: string;
  subject?: string;
  difficulty?: string;
}

interface ExamConfig {
  source: QuestionSource;
  selectedDocuments: string[];
  selectedQuestions: string[];
  numQuestions: number;
  questionTypes: {
    mcq: boolean;
    trueFalse: boolean;
    shortAnswer: boolean;
    essay: boolean;
  };
  difficulty: Difficulty;
  bloomLevel: BloomLevel;
  duration: number; // minutes
  totalMarks: number;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  templateId?: string;
}

const QUESTION_SOURCES = [
  { id: 'document' as QuestionSource, label: 'Uploaded Document', icon: FileText, description: 'Generate from a specific document' },
  { id: 'extracted' as QuestionSource, label: 'Extracted Questions', icon: Database, description: 'Use AI-extracted questions' },
  { id: 'question-bank' as QuestionSource, label: 'Question Bank', icon: Database, description: 'Select from your question bank' },
  { id: 'mixed' as QuestionSource, label: 'Mixed Sources', icon: Shuffle, description: 'Combine multiple sources' },
];

const DIFFICULTIES = [
  { id: 'easy' as Difficulty, label: 'Easy', color: 'green' },
  { id: 'medium' as Difficulty, label: 'Medium', color: 'yellow' },
  { id: 'hard' as Difficulty, label: 'Hard', color: 'red' },
  { id: 'mixed' as Difficulty, label: 'Mixed', color: 'purple' },
];

const BLOOM_LEVELS = [
  { id: 'remember' as BloomLevel, label: 'Remember', description: 'Recall facts' },
  { id: 'understand' as BloomLevel, label: 'Understand', description: 'Explain concepts' },
  { id: 'apply' as BloomLevel, label: 'Apply', description: 'Use knowledge' },
  { id: 'analyze' as BloomLevel, label: 'Analyze', description: 'Break down info' },
  { id: 'evaluate' as BloomLevel, label: 'Evaluate', description: 'Make judgments' },
  { id: 'create' as BloomLevel, label: 'Create', description: 'Produce new work' },
  { id: 'mixed' as BloomLevel, label: 'Mixed', description: 'All levels' },
];

export default function AIExamGeneratorWizard({
  isOpen,
  onClose,
  onExamGenerated,
}: AIExamGeneratorWizardProps) {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState<ExamConfig>({
    source: 'question-bank',
    selectedDocuments: [],
    selectedQuestions: [],
    numQuestions: 20,
    questionTypes: {
      mcq: true,
      trueFalse: true,
      shortAnswer: true,
      essay: false,
    },
    difficulty: 'mixed',
    bloomLevel: 'mixed',
    duration: 60,
    totalMarks: 100,
    randomizeQuestions: true,
    randomizeAnswers: true,
  });

  // Data loading states
  const [documents, setDocuments] = useState<Document[]>([]);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [questionBankQuestions, setQuestionBankQuestions] = useState<Question[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Load data when wizard opens or source changes
  useEffect(() => {
    if (isOpen) {
      loadSourceData();
    }
  }, [isOpen, config.source]);

  const loadSourceData = async () => {
    setLoadingData(true);
    const token = authService.getToken();
    
    try {
      if (config.source === 'document' || config.source === 'mixed') {
        // Load user's documents
        const response = await fetch(`${API_URL}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setDocuments(data.documents || []);
      }

      if (config.source === 'extracted' || config.source === 'question-bank' || config.source === 'mixed') {
        // Load extracted questions (they're all in exam-questions table)
        const response = await fetch(`${API_URL}/exam-questions?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        
        if (data.success && data.questions) {
          setExtractedQuestions(data.questions);
          setQuestionBankQuestions(data.questions);
        }
      }
    } catch (error) {
      console.error('Failed to load source data:', error);
      toast.error('Failed to load resources');
    } finally {
      setLoadingData(false);
    }
  };

  const updateConfig = (updates: Partial<ExamConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const toggleDocumentSelection = (docId: string) => {
    setConfig(prev => ({
      ...prev,
      selectedDocuments: prev.selectedDocuments.includes(docId)
        ? prev.selectedDocuments.filter(id => id !== docId)
        : [...prev.selectedDocuments, docId],
    }));
  };

  const toggleQuestionSelection = (questionId: string) => {
    setConfig(prev => ({
      ...prev,
      selectedQuestions: prev.selectedQuestions.includes(questionId)
        ? prev.selectedQuestions.filter(id => id !== questionId)
        : [...prev.selectedQuestions, questionId],
    }));
  };

  const canProceedFromStep1 = () => {
    if (config.source === 'document') {
      return config.selectedDocuments.length > 0;
    }
    if (config.source === 'extracted' || config.source === 'question-bank') {
      return config.selectedQuestions.length > 0;
    }
    if (config.source === 'mixed') {
      return config.selectedDocuments.length > 0 || config.selectedQuestions.length > 0;
    }
    return false;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Map frontend config to API request
      const request: GenerateExamRequest = {
        source: config.source,
        documentId: config.selectedDocuments[0], // Use first document
        questionIds: config.selectedQuestions,
        totalQuestions: config.numQuestions,
        questionTypes: config.questionTypes,
        difficulty: config.difficulty,
        bloomLevel: config.bloomLevel,
        durationMinutes: config.duration,
        totalMarks: config.totalMarks,
        randomizeQuestions: config.randomizeQuestions,
        randomizeAnswers: config.randomizeAnswers,
        templateId: config.templateId,
      };

      const result = await generateExam(request);
      
      toast.success(`Exam generated with ${result.questions.length} questions!`);
      onExamGenerated(result);
      onClose();
    } catch (error: any) {
      console.error('Failed to generate exam:', error);
      toast.error(error.response?.data?.message || 'Failed to generate exam');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const totalSteps = 4;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">AI Exam Generator</h2>
                <p className="text-sm text-gray-600">Configure your exam parameters</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    s <= step
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {s < step ? <CheckCircle className="w-5 h-5" /> : s}
                  </div>
                  {s < 4 && (
                    <div className={`w-20 h-1 mx-2 transition-colors ${
                      s < step ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Source</span>
              <span>Questions</span>
              <span>Settings</span>
              <span>Review</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Question Source</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {QUESTION_SOURCES.map(source => {
                    const Icon = source.icon;
                    return (
                      <button
                        key={source.id}
                        onClick={() => {
                          updateConfig({ source: source.id, selectedDocuments: [], selectedQuestions: [] });
                        }}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          config.source === source.id
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mb-2 ${
                          config.source === source.id ? 'text-purple-600' : 'text-gray-400'
                        }`} />
                        <div className="font-semibold text-gray-900">{source.label}</div>
                        <div className="text-sm text-gray-600 mt-1">{source.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Document Selection */}
              {(config.source === 'document' || config.source === 'mixed') && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Select Documents</h4>
                    <span className="text-sm text-gray-600">{config.selectedDocuments.length} selected</span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {loadingData ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 text-sm mb-4">No documents found</p>
                      <button
                        onClick={() => window.open('/dashboard/upload', '_blank')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Document
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {documents
                        .filter(doc => 
                          !searchTerm || 
                          doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.subject?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map(doc => (
                          <label
                            key={doc.id}
                            className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={config.selectedDocuments.includes(doc.id)}
                              onChange={() => toggleDocumentSelection(doc.id)}
                              className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">{doc.title}</div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {doc.subject && <span className="mr-2">{doc.subject}</span>}
                                {doc.classLevel && <span>{doc.classLevel}</span>}
                              </div>
                            </div>
                          </label>
                        ))}
                      {/* Upload new document button */}
                      <button
                        onClick={() => window.open('/dashboard/upload', '_blank')}
                        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-purple-600"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="text-sm font-medium">Upload New Document</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Extracted Questions Selection */}
              {(config.source === 'extracted' || config.source === 'mixed') && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Select Extracted Questions</h4>
                    <span className="text-sm text-gray-600">{config.selectedQuestions.length} selected</span>
                  </div>

                  {loadingData ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    </div>
                  ) : extractedQuestions.length === 0 ? (
                    <div className="text-center py-8">
                      <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 text-sm">No extracted questions available</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {extractedQuestions.slice(0, 50).map(question => (
                        <label
                          key={question.id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={config.selectedQuestions.includes(question.id)}
                            onChange={() => toggleQuestionSelection(question.id)}
                            className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-900 line-clamp-2">{question.text}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              <span className="mr-2 capitalize">{question.type}</span>
                              {question.difficulty && <span className="capitalize">{question.difficulty}</span>}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Question Bank Selection */}
              {(config.source === 'question-bank' || config.source === 'mixed') && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Select from Question Bank</h4>
                    <span className="text-sm text-gray-600">{config.selectedQuestions.length} selected</span>
                  </div>

                  {loadingData ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    </div>
                  ) : questionBankQuestions.length === 0 ? (
                    <div className="text-center py-8">
                      <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 text-sm mb-4">No questions in your bank</p>
                      <button
                        onClick={() => window.open('/dashboard/questions', '_blank')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                      >
                        Go to Question Bank
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {questionBankQuestions.slice(0, 50).map(question => (
                        <label
                          key={question.id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={config.selectedQuestions.includes(question.id)}
                            onChange={() => toggleQuestionSelection(question.id)}
                            className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-900 line-clamp-2">{question.text}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              <span className="mr-2 capitalize">{question.type}</span>
                              {question.difficulty && <span className="capitalize">{question.difficulty}</span>}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selection Summary */}
              {canProceedFromStep1() && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-900">
                      <div className="font-semibold mb-1">Ready to proceed!</div>
                      {config.selectedDocuments.length > 0 && (
                        <div>{config.selectedDocuments.length} document(s) selected</div>
                      )}
                      {config.selectedQuestions.length > 0 && (
                        <div>{config.selectedQuestions.length} question(s) selected</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Configuration</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Questions
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={config.numQuestions}
                      onChange={(e) => updateConfig({ numQuestions: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="300"
                      value={config.duration}
                      onChange={(e) => updateConfig({ duration: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Question Types
                  </label>
                  <div className="space-y-2">
                    {Object.entries(config.questionTypes).map(([type, enabled]) => (
                      <label key={type} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => updateConfig({
                            questionTypes: { ...config.questionTypes, [type]: e.target.checked }
                          })}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {type.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Difficulty Level
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {DIFFICULTIES.map(diff => (
                        <button
                          key={diff.id}
                          onClick={() => updateConfig({ difficulty: diff.id })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                            config.difficulty === diff.id
                              ? 'border-purple-600 bg-purple-50 text-purple-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          {diff.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Bloom's Taxonomy Level
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {BLOOM_LEVELS.map(level => (
                        <button
                          key={level.id}
                          onClick={() => updateConfig({ bloomLevel: level.id })}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            config.bloomLevel === level.id
                              ? 'border-purple-600 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`text-sm font-semibold ${
                            config.bloomLevel === level.id ? 'text-purple-700' : 'text-gray-900'
                          }`}>
                            {level.label}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">{level.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total Marks
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="200"
                        value={config.totalMarks}
                        onChange={(e) => updateConfig({ totalMarks: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 mt-6">
                    <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.randomizeQuestions}
                        onChange={(e) => updateConfig({ randomizeQuestions: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Randomize Questions</div>
                        <div className="text-xs text-gray-600">Shuffle question order for each student</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.randomizeAnswers}
                        onChange={(e) => updateConfig({ randomizeAnswers: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Randomize MCQ Answers</div>
                        <div className="text-xs text-gray-600">Shuffle answer options in multiple choice questions</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review & Generate</h3>
                
                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Source</div>
                      <div className="font-semibold text-gray-900 capitalize">{config.source.replace('-', ' ')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Questions</div>
                      <div className="font-semibold text-gray-900">{config.numQuestions}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Duration</div>
                      <div className="font-semibold text-gray-900">{config.duration} minutes</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total Marks</div>
                      <div className="font-semibold text-gray-900">{config.totalMarks}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Difficulty</div>
                      <div className="font-semibold text-gray-900 capitalize">{config.difficulty}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Bloom Level</div>
                      <div className="font-semibold text-gray-900 capitalize">{config.bloomLevel}</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">Question Types</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(config.questionTypes)
                        .filter(([_, enabled]) => enabled)
                        .map(([type]) => (
                          <span key={type} className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                            {type.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">Options</div>
                    <div className="space-y-1 text-sm">
                      {config.randomizeQuestions && <div className="text-gray-700">✓ Randomize question order</div>}
                      {config.randomizeAnswers && <div className="text-gray-700">✓ Randomize answer options</div>}
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <div className="font-semibold mb-1">AI will generate:</div>
                      <ul className="space-y-1 text-blue-800">
                        <li>• Complete exam with {config.numQuestions} questions</li>
                        <li>• Answer key with explanations</li>
                        <li>• Mark distribution and rubrics</li>
                        <li>• Professional formatting</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center gap-3">
            {step < totalSteps ? (
              <>
                {step === 1 && !canProceedFromStep1() && (
                  <p className="text-sm text-red-600 mr-2">
                    Please select at least one document or question
                  </p>
                )}
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && !canProceedFromStep1()}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
              
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Exam...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Exam
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
