"use client";

import { useState } from 'react';
import { Sparkles, ChevronDown, Loader2, Copy, Check } from 'lucide-react';
import { generateQuestionVariations, QuestionVariation } from '@/lib/api/ai';
import { toast } from 'react-hot-toast';

interface QuestionVariationPanelProps {
  questionId: string;
  questionText: string;
  onVariationCreated?: (variation: QuestionVariation) => void;
}

const VARIATION_TYPES = [
  { value: 'all', label: '✨ Generate All Variations', icon: '🎭' },
  { value: 'easier', label: 'Easier Version', icon: '📉', description: 'Simplify for lower grades' },
  { value: 'harder', label: 'Harder Version', icon: '📈', description: 'Increase difficulty' },
  { value: 'scenario_based', label: 'Scenario-Based', icon: '🎬', description: 'Real-world context' },
  { value: 'mcq', label: 'Multiple Choice', icon: '🔘', description: 'Convert to MCQ' },
  { value: 'true_false', label: 'True/False', icon: '✓✗', description: 'Convert to T/F' },
  { value: 'short_answer', label: 'Short Answer', icon: '📝', description: 'Open-ended' },
  { value: 'essay', label: 'Essay Question', icon: '📄', description: 'Long-form' },
  { value: 'fill_blank', label: 'Fill in the Blank', icon: '___', description: 'Cloze format' },
];

export default function QuestionVariationPanel({
  questionId,
  questionText,
  onVariationCreated,
}: QuestionVariationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variations, setVariations] = useState<QuestionVariation[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async (variationType: string) => {
    setIsGenerating(true);
    setSelectedType(variationType);
    
    try {
      const response = await generateQuestionVariations({
        questionId,
        variationType: variationType as any,
        customInstructions: customInstructions || undefined,
      });

      setVariations(response.variations);
      toast.success(`Generated ${response.variations.length} variation(s)!`);
      
      // Notify parent if callback provided
      response.variations.forEach(v => {
        onVariationCreated?.(v);
      });
    } catch (error: any) {
      console.error('Failed to generate variations:', error);
      toast.error(error.response?.data?.message || 'Failed to generate variations');
    } finally {
      setIsGenerating(false);
      setSelectedType('');
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg"
      >
        <Sparkles className="w-4 h-4" />
        Generate Variations
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Question Variations
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Generate different versions to prevent answer sharing
              </p>
            </div>

            {/* Original Question Preview */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Original Question</p>
              <p className="text-sm text-gray-700 line-clamp-3">{questionText}</p>
            </div>

            {/* Custom Instructions */}
            <div className="p-4 border-b border-gray-200">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Custom Instructions (Optional)
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g., Make it suitable for Grade 7 students..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Variation Type Buttons */}
            <div className="p-4 space-y-2">
              {VARIATION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleGenerate(type.value)}
                  disabled={isGenerating}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    isGenerating && selectedType === type.value
                      ? 'bg-purple-50 border-purple-500'
                      : 'bg-white border-gray-200 hover:bg-purple-50 hover:border-purple-300'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{type.label}</p>
                    {type.description && (
                      <p className="text-xs text-gray-500">{type.description}</p>
                    )}
                  </div>
                  {isGenerating && selectedType === type.value && (
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  )}
                </button>
              ))}
            </div>

            {/* Generated Variations */}
            {variations.length > 0 && (
              <div className="p-4 bg-green-50 border-t border-green-200">
                <h4 className="font-bold text-sm text-green-900 mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Generated Variations ({variations.length})
                </h4>
                <div className="space-y-3">
                  {variations.map((variation, index) => (
                    <div 
                      key={index}
                      className="bg-white rounded-lg p-3 border border-green-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                            {variation.variationType}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                            {variation.type}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                            {variation.difficulty}
                          </span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(variation.text, index)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-gray-800 mb-2">{variation.text}</p>
                      {variation.options && variation.options.length > 0 && (
                        <div className="pl-3 space-y-1">
                          {variation.options.map((opt, idx) => (
                            <p key={idx} className="text-xs text-gray-600">{opt}</p>
                          ))}
                        </div>
                      )}
                      {variation.correctAnswer && (
                        <p className="text-xs text-green-700 mt-2">
                          <strong>Answer:</strong> {variation.correctAnswer}
                        </p>
                      )}
                      {variation.explanation && (
                        <p className="text-xs text-gray-600 mt-1 italic">
                          {variation.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
