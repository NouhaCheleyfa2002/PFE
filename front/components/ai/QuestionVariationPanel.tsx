"use client";

import { useState } from 'react';
import { Sparkles, ChevronDown, Loader2, Copy, Check, Plus, X, CheckCircle, XCircle } from 'lucide-react';
import { generateQuestionVariations, saveVariation, QuestionVariation, VariationRequest } from '@/lib/api/ai';
import { toast } from 'react-hot-toast';

interface QuestionVariationPanelProps {
  questionId: string;
  questionText: string;
  onVariationCreated?: (variation: QuestionVariation) => void;
  onQuestionBankUpdated?: () => void; // NEW: Called when a variation is saved
}

const TRANSFORMATIONS = [
  { value: 'easier', label: 'Easier', icon: '📉', description: 'Simplify complexity' },
  { value: 'harder', label: 'Harder', icon: '📈', description: 'Increase difficulty' },
  { value: 'scenario_based', label: 'Scenario-Based', icon: '🎬', description: 'Add real-world context' },
  { value: 'same_concept', label: 'Same Level', icon: '🔄', description: 'Different wording' },
];

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice', icon: '🔘', description: '4 options' },
  { value: 'true_false', label: 'True/False', icon: '✓✗', description: 'T/F question' },
  { value: 'short_answer', label: 'Short Answer', icon: '📝', description: 'Brief response' },
  { value: 'essay', label: 'Essay', icon: '📄', description: 'Detailed analysis' },
  { value: 'fill_blank', label: 'Fill in Blank', icon: '___', description: 'Complete sentence' },
];

const QUICK_PRESETS = [
  {
    label: '🎭 All Variations',
    variations: [
      { transformation: 'easier' as const, questionType: 'short_answer' as const },
      { transformation: 'same_concept' as const, questionType: 'mcq' as const },
      { transformation: 'harder' as const, questionType: 'essay' as const },
      { transformation: 'same_concept' as const, questionType: 'true_false' as const },
      { transformation: 'scenario_based' as const, questionType: 'short_answer' as const },
      { transformation: 'same_concept' as const, questionType: 'fill_blank' as const },
    ],
  },
  {
    label: '📊 MCQ Set',
    variations: [
      { transformation: 'easier' as const, questionType: 'mcq' as const },
      { transformation: 'same_concept' as const, questionType: 'mcq' as const },
      { transformation: 'harder' as const, questionType: 'mcq' as const },
    ],
  },
  {
    label: '📝 Practice Set',
    variations: [
      { transformation: 'easier' as const, questionType: 'short_answer' as const },
      { transformation: 'same_concept' as const, questionType: 'true_false' as const },
      { transformation: 'harder' as const, questionType: 'short_answer' as const },
    ],
  },
];

export default function QuestionVariationPanel({
  questionId,
  questionText,
  onVariationCreated,
  onQuestionBankUpdated,
}: QuestionVariationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variations, setVariations] = useState<QuestionVariation[]>([]);
  const [customInstructions, setCustomInstructions] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [savedVariations, setSavedVariations] = useState<Set<number>>(new Set());
  const [discardedVariations, setDiscardedVariations] = useState<Set<number>>(new Set());
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  
  // Custom variation builder
  const [customVariations, setCustomVariations] = useState<VariationRequest[]>([
    { transformation: 'same_concept', questionType: 'mcq' },
  ]);

  const handleGenerateCustom = async () => {
    if (customVariations.length === 0) {
      toast.error('Add at least one variation');
      return;
    }

    setIsGenerating(true);
    
    try {
      const response = await generateQuestionVariations({
        questionId,
        variations: customVariations,
        customInstructions: customInstructions || undefined,
      });

      setVariations(response.variations);
      toast.success(`Generated ${response.variations.length} variation(s)!`);
      
      // Reset saved/discarded state for new generations
      setSavedVariations(new Set());
      setDiscardedVariations(new Set());
      
      // Don't notify parent yet - wait for user to save variations
    } catch (error: any) {
      console.error('Failed to generate variations:', error);
      toast.error(error.response?.data?.message || 'Failed to generate variations');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePreset = async (preset: typeof QUICK_PRESETS[0]) => {
    setIsGenerating(true);
    
    try {
      const response = await generateQuestionVariations({
        questionId,
        variations: preset.variations,
        customInstructions: customInstructions || undefined,
      });

      setVariations(response.variations);
      toast.success(`Generated ${response.variations.length} variation(s)!`);
      
      // Reset saved/discarded state for new generations
      setSavedVariations(new Set());
      setDiscardedVariations(new Set());
      
      // Don't notify parent yet - wait for user to save variations
    } catch (error: any) {
      console.error('Failed to generate variations:', error);
      toast.error(error.response?.data?.message || 'Failed to generate variations');
    } finally {
      setIsGenerating(false);
    }
  };

  const addVariation = () => {
    setCustomVariations([...customVariations, { transformation: 'same_concept', questionType: 'mcq' }]);
  };

  const removeVariation = (index: number) => {
    setCustomVariations(customVariations.filter((_, i) => i !== index));
  };

  const updateVariation = (index: number, field: keyof VariationRequest, value: string) => {
    const updated = [...customVariations];
    updated[index] = { ...updated[index], [field]: value };
    setCustomVariations(updated);
  };

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSaveVariation = async (variation: QuestionVariation, index: number) => {
    if (savedVariations.has(index) || discardedVariations.has(index)) {
      return; // Already handled
    }

    setSavingIndex(index);
    
    try {
      await saveVariation(variation, questionId);
      
      setSavedVariations(prev => new Set(prev).add(index));
      toast.success('Added to question bank!');
      
      // Notify parent if callback provided
      onVariationCreated?.(variation);
      
      // Notify parent to refresh the question bank
      onQuestionBankUpdated?.();
    } catch (error: any) {
      console.error('Failed to save variation:', error);
      toast.error('Failed to save variation');
    } finally {
      setSavingIndex(null);
    }
  };

  const handleDiscardVariation = (index: number) => {
    if (savedVariations.has(index) || discardedVariations.has(index)) {
      return; // Already handled
    }

    setDiscardedVariations(prev => new Set(prev).add(index));
    toast.success('Variation discarded');
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
          <div className="absolute right-0 mt-2 w-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[700px] overflow-y-auto">
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
                placeholder="e.g., Focus on practical applications..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Quick Presets */}
            <div className="p-4 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2">Quick Presets</p>
              <div className="flex gap-2 flex-wrap">
                {QUICK_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleGeneratePreset(preset)}
                    disabled={isGenerating}
                    className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors disabled:opacity-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Variation Builder */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-700">Custom Variations</p>
                <button
                  onClick={addVariation}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>

              <div className="space-y-3">
                {customVariations.map((variation, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Transformation</label>
                        <select
                          value={variation.transformation}
                          onChange={(e) => updateVariation(idx, 'transformation', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          {TRANSFORMATIONS.map(t => (
                            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Question Type</label>
                        <select
                          value={variation.questionType}
                          onChange={(e) => updateVariation(idx, 'questionType', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          {QUESTION_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {customVariations.length > 1 && (
                      <button
                        onClick={() => removeVariation(idx)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleGenerateCustom}
                disabled={isGenerating}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate {customVariations.length} Variation{customVariations.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>

            {/* Generated Variations */}
            {variations.length > 0 && (
              <div className="p-4 bg-green-50">
                <h4 className="font-bold text-sm text-green-900 mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Generated Variations ({variations.length})
                </h4>
                <div className="space-y-3">
                  {variations.map((variation, index) => {
                    const isSaved = savedVariations.has(index);
                    const isDiscarded = discardedVariations.has(index);
                    const isSaving = savingIndex === index;
                    
                    return (
                      <div 
                        key={index}
                        className={`bg-white rounded-lg p-3 border ${
                          isSaved ? 'border-green-400 bg-green-50' :
                          isDiscarded ? 'border-red-300 bg-red-50 opacity-60' :
                          'border-green-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                              {variation.transformation || variation.type}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                              {variation.type}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                              {variation.difficulty}
                            </span>
                            {isSaved && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Added to Bank
                              </span>
                            )}
                            {isDiscarded && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Discarded
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => copyToClipboard(variation.text || variation.questionText, index)}
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
                        <p className="text-sm text-gray-800 mb-2 font-medium">{variation.text || variation.questionText}</p>
                        {variation.options && variation.options.length > 0 && (
                          <div className="pl-3 space-y-1 mb-2">
                            {variation.options.map((opt, idx) => (
                              <p key={idx} className="text-xs text-gray-600">{opt}</p>
                            ))}
                          </div>
                        )}
                        {variation.correctAnswer && (
                          <p className="text-xs text-green-700 bg-green-50 p-2 rounded mb-2">
                            <strong>Answer:</strong> {variation.correctAnswer}
                          </p>
                        )}
                        {variation.explanation && (
                          <p className="text-xs text-gray-600 mb-2 italic">
                            {variation.explanation}
                          </p>
                        )}
                        
                        {/* Action Buttons */}
                        {!isSaved && !isDiscarded && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => handleSaveVariation(variation, index)}
                              disabled={isSaving}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  Add to Question Bank
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDiscardVariation(index)}
                              disabled={isSaving}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <XCircle className="w-4 h-4" />
                              Discard
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
