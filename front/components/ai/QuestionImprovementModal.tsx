"use client";

import { useState } from 'react';
import { X, Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import { improveQuestion, ImproveQuestionResponse } from '@/lib/api/ai';
import { toast } from 'react-hot-toast';

interface QuestionImprovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  questionText: string;
  questionType: string;
  options?: string[];
  onApplyImprovement?: (improvedText: string, improvedOptions?: string[]) => void;
}

const IMPROVEMENT_TYPES = [
  { 
    value: 'fix_grammar', 
    label: 'Fix Grammar', 
    icon: '✏️', 
    description: 'Correct grammatical errors and typos'
  },
  { 
    value: 'clarify_wording', 
    label: 'Clarify Wording', 
    icon: '💡', 
    description: 'Make the question clearer and more precise'
  },
  { 
    value: 'reduce_ambiguity', 
    label: 'Reduce Ambiguity', 
    icon: '🎯', 
    description: 'Remove any confusing or unclear phrasing'
  },
  { 
    value: 'simplify', 
    label: 'Simplify', 
    icon: '📉', 
    description: 'Make the question easier to understand'
  },
  { 
    value: 'increase_difficulty', 
    label: 'Increase Difficulty', 
    icon: '📈', 
    description: 'Make the question more challenging'
  },
  { 
    value: 'improve_distractors', 
    label: 'Improve Distractors', 
    icon: '🎭', 
    description: 'Make MCQ wrong options more plausible',
    mcqOnly: true
  },
];

export default function QuestionImprovementModal({
  isOpen,
  onClose,
  questionId,
  questionText,
  questionType,
  options,
  onApplyImprovement,
}: QuestionImprovementModalProps) {
  const [selectedImprovements, setSelectedImprovements] = useState<string[]>([]);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [result, setResult] = useState<ImproveQuestionResponse | null>(null);

  // Debug logging
  console.log('[QuestionImprovementModal] Render called with:', {
    isOpen,
    questionId,
    questionText: questionText?.substring(0, 50),
    questionType
  });

  if (!isOpen) {
    console.log('[QuestionImprovementModal] Not open, returning null');
    return null;
  }

  // Validate required props
  if (!questionId || !questionText) {
    console.error('[QuestionImprovementModal] Missing required props:', { questionId, hasText: !!questionText });
    return null;
  }

  console.log('[QuestionImprovementModal] Rendering modal UI');

  const toggleImprovement = (type: string) => {
    setSelectedImprovements(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleImprove = async () => {
    console.log('[QuestionImprovementModal] handleImprove called');
    console.log('[QuestionImprovementModal] Selected improvements:', selectedImprovements);
    console.log('[QuestionImprovementModal] Question ID:', questionId);
    
    if (selectedImprovements.length === 0) {
      toast.error('Please select at least one improvement type');
      return;
    }

    setIsImproving(true);
    setResult(null);

    try {
      console.log('[QuestionImprovementModal] Calling API...');
      const response = await improveQuestion({
        questionId,
        improvementTypes: selectedImprovements as any,
        customInstructions: customInstructions || undefined,
      });

      console.log('[QuestionImprovementModal] API response:', response);
      setResult(response);
      toast.success('Question improved successfully!');
    } catch (error: any) {
      console.error('[QuestionImprovementModal] Failed to improve question:', error);
      console.error('[QuestionImprovementModal] Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to improve question');
    } finally {
      setIsImproving(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApplyImprovement?.(
        result.improvedQuestion.text,
        result.improvedQuestion.options
      );
      toast.success('Improvements applied!');
      onClose();
    }
  };

  const isMCQ = questionType === 'mcq' || questionType === 'multiple_choice';
  const availableImprovements = IMPROVEMENT_TYPES.filter(
    type => !type.mcqOnly || isMCQ
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">AI Question Improvement</h2>
                <p className="text-sm text-gray-600">Enhance your question with AI-powered suggestions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Original Question */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Original Question</h3>
            <p className="text-gray-900 mb-2">{questionText}</p>
            {options && options.length > 0 && (
              <div className="mt-3 space-y-1">
                {options.map((opt, idx) => (
                  <p key={idx} className="text-sm text-gray-600">{opt}</p>
                ))}
              </div>
            )}
          </div>

          {/* Improvement Types Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
              Select Improvements to Apply
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableImprovements.map((type) => (
                <button
                  key={type.value}
                  onClick={() => toggleImprovement(type.value)}
                  disabled={isImproving}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                    selectedImprovements.includes(type.value)
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  } ${isImproving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{type.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                  </div>
                  {selectedImprovements.includes(type.value) && (
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Custom Instructions (Optional)
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., Ensure the question is appropriate for high school students..."
              rows={3}
              disabled={isImproving}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Improve Button */}
          {!result && (
            <button
              onClick={handleImprove}
              disabled={isImproving || selectedImprovements.length === 0}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isImproving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Improving Question...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Improve Question
                </>
              )}
            </button>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Improved Question */}
              <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <h3 className="text-sm font-semibold text-green-800 uppercase mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Improved Question
                </h3>
                <p className="text-gray-900 font-medium mb-2">{result.improvedQuestion.text}</p>
                {result.improvedQuestion.options && result.improvedQuestion.options.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {result.improvedQuestion.options.map((opt, idx) => (
                      <p key={idx} className="text-sm text-gray-700">{opt}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Improvements Made */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                  Improvements Made
                </h3>
                <div className="space-y-3">
                  {result.improvements.map((improvement, idx) => (
                    <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-blue-900 mb-1">
                            {improvement.improvementType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mb-2">
                            {improvement.changes.map((change, cIdx) => (
                              <li key={cIdx}>{change}</li>
                            ))}
                          </ul>
                          <p className="text-xs text-gray-600 italic">{improvement.reasoning}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="text-sm font-semibold text-purple-800 uppercase mb-2">Summary</h3>
                <p className="text-sm text-gray-700">{result.summary}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleApply}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Apply Improvements
                </button>
                <button
                  onClick={() => setResult(null)}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
