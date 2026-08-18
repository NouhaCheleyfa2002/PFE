"use client";

import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateVariations, GenerateVariationsDto } from '@/lib/api/ai';

interface QuestionVariationGeneratorProps {
  questionId: string;
  questionText: string;
  onClose: () => void;
  onVariationCreated?: (variation: any) => void;
}

const VARIATION_TYPES = [
  { value: 'easier', label: '📉 Easier Version', description: 'Simplify for lower grade levels' },
  { value: 'harder', label: '📈 Harder Version', description: 'Increase difficulty and depth' },
  { value: 'scenario_based', label: '🎭 Scenario-Based', description: 'Real-world application' },
  { value: 'mcq', label: '✅ Multiple Choice', description: 'Convert to MCQ format' },
  { value: 'true_false', label: '✓/✗ True/False', description: 'Convert to T/F format' },
  { value: 'short_answer', label: '✏️ Short Answer', description: 'Convert to short answer' },
  { value: 'essay', label: '📝 Essay Question', description: 'Convert to essay format' },
  { value: 'fill_blank', label: '⬜ Fill in Blank', description: 'Convert to fill-in-blank' },
  { value: 'all', label: '🌟 All Variations', description: 'Generate all possible variations' },
];

export default function QuestionVariationGenerator({
  questionId,
  questionText,
  onClose,
  onVariationCreated,
}: QuestionVariationGeneratorProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [variations, setVariations] = useState<any[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!selectedType) {
      toast.error('Please select a variation type');
      return;
    }

    setIsGenerating(true);
    const loadingToast = toast.loading('Generating variations...');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const data: GenerateVariationsDto = {
        questionId,
        variationType: selectedType as any,
        customInstructions: customInstructions || undefined,
      };

      const response = await generateVariations(data, token);

      setVariations(response.variations || []);
      toast.success(`Generated ${response.variations?.length || 0} variation(s)!`, { id: loadingToast });

      if (onVariationCreated && response.variations?.length > 0) {
        response.variations.forEach((v: any) => onVariationCreated(v));
      }
    } catch (error: any) {
      console.error('Failed to generate variations:', error);
      toast.error(error.message || 'Failed to generate variations', { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Generate Question Variations</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Original Question */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Original Question:</p>
            <p className="text-gray-900">{questionText}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Variation Type Selection */}
          {variations.length === 0 && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Variation Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {VARIATION_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        selectedType === type.value
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-gray-900 mb-1">{type.label}</div>
                      <div className="text-xs text-gray-600">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Instructions (Optional)
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="E.g., Make it suitable for Grade 10 students, Focus on practical applications..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Generated Variations */}
          {variations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Generated Variations ({variations.length})
                </h3>
                <button
                  onClick={() => {
                    setVariations([]);
                    setSelectedType('');
                    setCustomInstructions('');
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Generate More
                </button>
              </div>

              {variations.map((variation, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                        {variation.variationType}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        {variation.type}
                      </span>
                      {variation.difficulty && (
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          variation.difficulty === 'easy'
                            ? 'bg-green-100 text-green-700'
                            : variation.difficulty === 'hard'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {variation.difficulty}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopy(variation.text, index)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>

                  <p className="text-gray-900 mb-3">{variation.text}</p>

                  {variation.options && variation.options.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {variation.options.map((option: string, optIdx: number) => (
                        <div
                          key={optIdx}
                          className={`p-2 rounded ${
                            option.startsWith(variation.correctAnswer)
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-gray-50'
                          }`}
                        >
                          <span className="text-sm text-gray-900">{option}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {variation.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs font-medium text-blue-900 mb-1">Explanation:</p>
                      <p className="text-sm text-blue-800">{variation.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {variations.length === 0 && (
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!selectedType || isGenerating}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Variations
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
