"use client";

import { useState } from 'react';
import { X, Sparkles, Loader2, Plus, Trash2, Check } from 'lucide-react';
import { generateRubric, GenerateRubricResponse } from '@/lib/api/ai';
import { toast } from 'react-hot-toast';

interface RubricGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  questionText: string;
  onRubricGenerated?: (rubric: GenerateRubricResponse) => void;
}

const DEFAULT_CRITERIA = [
  'Content/Accuracy',
  'Structure/Organization',
  'Grammar/Writing Quality',
];

export default function RubricGeneratorModal({
  isOpen,
  onClose,
  questionId,
  questionText,
  onRubricGenerated,
}: RubricGeneratorModalProps) {
  const [totalPoints, setTotalPoints] = useState(10);
  const [criteria, setCriteria] = useState<string[]>(DEFAULT_CRITERIA);
  const [newCriterion, setNewCriterion] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [rubric, setRubric] = useState<GenerateRubricResponse | null>(null);

  if (!isOpen) return null;

  const addCriterion = () => {
    if (newCriterion.trim() && !criteria.includes(newCriterion.trim())) {
      setCriteria([...criteria, newCriterion.trim()]);
      setNewCriterion('');
    }
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (criteria.length === 0) {
      toast.error('Please add at least one criterion');
      return;
    }

    setIsGenerating(true);
    setRubric(null);

    try {
      const response = await generateRubric({
        questionId,
        totalPoints,
        criteria: criteria.length > 0 ? criteria : undefined,
        customInstructions: customInstructions || undefined,
      });

      setRubric(response);
      onRubricGenerated?.(response);
      toast.success('Rubric generated successfully!');
    } catch (error: any) {
      console.error('Failed to generate rubric:', error);
      toast.error(error.response?.data?.message || 'Failed to generate rubric');
    } finally {
      setIsGenerating(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-300';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'satisfactory': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'needs improvement': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Rubric Generator</h2>
                <p className="text-sm text-gray-600">Create detailed assessment criteria for essay questions</p>
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
          {!rubric ? (
            <>
              {/* Question Preview */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Essay Question</h3>
                <p className="text-gray-900">{questionText}</p>
              </div>

              {/* Total Points */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Total Points for This Question
                </label>
                <input
                  type="number"
                  value={totalPoints}
                  onChange={(e) => setTotalPoints(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={100}
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Criteria */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assessment Criteria
                </label>
                <div className="space-y-2 mb-3">
                  {criteria.map((criterion, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-gray-900">
                        {criterion}
                      </div>
                      <button
                        onClick={() => removeCriterion(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCriterion}
                    onChange={(e) => setNewCriterion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCriterion()}
                    placeholder="Add custom criterion..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={addCriterion}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
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
                  placeholder="e.g., Focus on critical thinking and analytical skills..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || criteria.length === 0}
                className="w-full py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Rubric...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Rubric
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Generated Rubric */}
              <div className="space-y-6">
                {/* Header */}
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-emerald-900">Assessment Rubric</h3>
                    <span className="px-3 py-1 bg-emerald-600 text-white text-sm font-bold rounded-full">
                      {rubric.totalPoints} Points
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{rubric.questionText}</p>
                </div>

                {/* Criteria */}
                {rubric.criteria.map((criterion, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Criterion Header */}
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900">{criterion.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{criterion.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-emerald-600">{criterion.points}</p>
                          <p className="text-xs text-gray-500">{criterion.percentage}%</p>
                        </div>
                      </div>
                    </div>

                    {/* Performance Levels */}
                    <div className="p-4 space-y-3">
                      {criterion.levels.map((level, levelIdx) => (
                        <div
                          key={levelIdx}
                          className={`p-3 rounded-lg border-2 ${getLevelColor(level.level)}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-bold text-sm">{level.level}</span>
                            <span className="text-sm font-semibold">
                              {level.pointRange[0]} - {level.pointRange[1]} pts
                            </span>
                          </div>
                          <p className="text-sm">{level.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(rubric, null, 2));
                      toast.success('Rubric copied to clipboard!');
                    }}
                    className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Copy Rubric
                  </button>
                  <button
                    onClick={() => setRubric(null)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Generate New
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
