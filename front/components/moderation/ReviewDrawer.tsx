'use client';

import React, { useState } from 'react';
import {
  X,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Calendar,
  User,
  Tag,
  Activity,
  Zap,
  Info,
  ChevronRight,
  CheckSquare
} from 'lucide-react';

interface ModerationItem {
  id: string;
  document: {
    id: string;
    title: string;
    originalName: string;
    uploadedBy: string;
    uploadedAt: string;
  };
  aiScores: {
    safety: number;
    quality: number;
    overall: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  detectedMetadata: {
    subject: string | null;
    category: string | null;
    gradeLevel: string | null;
    language: string | null;
    bacSection?: string | null;
    difficultyLevel?: string | null;
    difficultyScore?: number | null;
    difficultyReasoning?: string | null;
  };
  flags: {
    inappropriateContent: boolean;
    pii: boolean;
    malware: boolean;
    duplicate: boolean;
  };
  advancedAI?: {
    piiDetection?: {
      found: boolean;
      score: number;
      details: Array<{
        type: string;
        value: string;
        location: string;
        confidence: number;
      }>;
    };
    learningObjectives?: string[];
    bloomLevel?: string | null;
    duplicateDetection?: {
      isDuplicate: boolean;
      similarityScore: number | null;
      duplicateOfId: string | null;
      checkCompleted: boolean;
    };
  };
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  aiRecommendation: {
    action: string;
    confidence: number;
    reasoning: string;
  };
  processingCompleted: boolean;
}

interface ReviewDrawerProps {
  item: ModerationItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, reason: string, notes?: string) => Promise<void>;
  onRequestChanges: (id: string, changes: string, notes?: string) => Promise<void>;
  actionLoading: boolean;
}

export default function ReviewDrawer({
  item,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onRequestChanges,
  actionLoading
}: ReviewDrawerProps) {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReason, setRejectReason] = useState<string[]>([]);
  const [changesNeeded, setChangesNeeded] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');

  if (!item || !isOpen) return null;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'bg-green-500';
    if (score >= 80) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 95) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <span className="text-red-600">🔴</span>;
      case 'high': return <span className="text-orange-600">🟠</span>;
      case 'medium': return <span className="text-yellow-600">🟡</span>;
      default: return <span className="text-blue-600">🔵</span>;
    }
  };

  const categorizeIssues = () => {
    const categories: { [key: string]: typeof item.issues } = {
      OCR: [],
      Formatting: [],
      Educational: [],
      Metadata: [],
      Safety: [],
      Other: []
    };

    item.issues.forEach(issue => {
      const desc = issue.description.toLowerCase();
      if (desc.includes('ocr') || desc.includes('text') || desc.includes('character')) {
        categories.OCR.push(issue);
      } else if (desc.includes('format') || desc.includes('page') || desc.includes('layout')) {
        categories.Formatting.push(issue);
      } else if (desc.includes('educational') || desc.includes('quality') || desc.includes('difficulty')) {
        categories.Educational.push(issue);
      } else if (desc.includes('metadata') || desc.includes('category') || desc.includes('subject')) {
        categories.Metadata.push(issue);
      } else if (desc.includes('safety') || desc.includes('inappropriate') || desc.includes('malware')) {
        categories.Safety.push(issue);
      } else {
        categories.Other.push(issue);
      }
    });

    return Object.entries(categories).filter(([_, issues]) => issues.length > 0);
  };

  const categorizedIssues = categorizeIssues();

  const handleApprove = async () => {
    await onApprove(item.id, adminNotes);
    setShowApproveModal(false);
    setAdminNotes('');
    onClose();
  };

  const handleReject = async () => {
    const fullReason = [...rejectReason, customMessage].filter(Boolean).join('; ');
    await onReject(item.id, fullReason, adminNotes);
    setShowRejectModal(false);
    setRejectReason([]);
    setCustomMessage('');
    setAdminNotes('');
    onClose();
  };

  const handleRequestChanges = async () => {
    const fullChanges = [...changesNeeded, customMessage].filter(Boolean).join('; ');
    await onRequestChanges(item.id, fullChanges, adminNotes);
    setShowChangesModal(false);
    setChangesNeeded([]);
    setCustomMessage('');
    setAdminNotes('');
    onClose();
  };

  const toggleRejectReason = (reason: string) => {
    setRejectReason(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const toggleChangeNeeded = (change: string) => {
    setChangesNeeded(prev =>
      prev.includes(change) ? prev.filter(c => c !== change) : [...prev, change]
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity z-40 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[600px] lg:w-[700px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-gray-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {item.document.title || item.document.originalName}
                </h2>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskColor(item.riskLevel)}`}>
                  {item.riskLevel.toUpperCase()} RISK
                </span>
                {item.detectedMetadata.subject && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    {item.detectedMetadata.subject}
                  </span>
                )}
                {item.detectedMetadata.gradeLevel && (
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                    {item.detectedMetadata.gradeLevel}
                  </span>
                )}
                {item.detectedMetadata.language && (
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                    {item.detectedMetadata.language}
                  </span>
                )}
                {item.detectedMetadata.bacSection && (
                  <span className="px-3 py-1 bg-gradient-to-r from-orange-50 to-red-50 text-orange-700 border border-orange-200 rounded-full text-xs font-semibold">
                    Bac {item.detectedMetadata.bacSection.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Document Meta */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{item.document.uploadedBy}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(item.document.uploadedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* AI Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">AI Summary</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">
                      {item.aiScores.safety >= 95 ? 'No malicious content detected' : 'Safety check completed'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    {item.flags.pii ? (
                      <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="text-gray-700">
                      {item.flags.pii ? 'Personal information detected' : 'No personal information found'}
                    </span>
                  </li>
                  {item.aiScores.quality < 80 && (
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        {item.aiScores.quality < 60 ? 'Low quality detected' : 'Quality could be improved'}
                      </span>
                    </li>
                  )}
                  {item.issues.length > 0 && (
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{item.issues.length} issues detected</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-xs font-semibold text-gray-700 mb-1">AI Recommendation</p>
              <p className="text-sm font-medium text-blue-900 mb-1">
                {item.aiRecommendation.action.replace('_', ' ').toUpperCase()}
              </p>
              <p className="text-xs text-gray-600">{item.aiRecommendation.reasoning}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 bg-white rounded-full h-2">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${item.aiRecommendation.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {Math.round(item.aiRecommendation.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* AI Scores */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              AI Quality Scores
            </h3>

            {/* Overall Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Score</span>
                <span className="text-sm font-bold text-gray-900">
                  {item.aiScores.overall}% · {getScoreLabel(item.aiScores.overall)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-full rounded-full transition-all ${getScoreColor(item.aiScores.overall)}`}
                  style={{ width: `${item.aiScores.overall}%` }}
                />
              </div>
            </div>

            {/* Safety Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Safety</span>
                <span className="text-sm font-bold text-gray-900">
                  {item.aiScores.safety}% · {getScoreLabel(item.aiScores.safety)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-full rounded-full transition-all ${getScoreColor(item.aiScores.safety)}`}
                  style={{ width: `${item.aiScores.safety}%` }}
                />
              </div>
            </div>

            {/* Quality Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Educational Quality</span>
                <span className="text-sm font-bold text-gray-900">
                  {item.aiScores.quality}% · {getScoreLabel(item.aiScores.quality)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-full rounded-full transition-all ${getScoreColor(item.aiScores.quality)}`}
                  style={{ width: `${item.aiScores.quality}%` }}
                />
              </div>
            </div>
          </div>

          {/* Phase 4: Advanced AI Insights */}
          {item.advancedAI && (
            <>
              {/* PII Detection */}
              {item.advancedAI.piiDetection && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Privacy Analysis
                  </h3>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">PII Detection Score</span>
                      <span className={`text-sm font-bold ${item.advancedAI.piiDetection.score >= 90 ? 'text-green-600' : 'text-orange-600'}`}>
                        {item.advancedAI.piiDetection.score}% Safe
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className={`h-full rounded-full transition-all ${item.advancedAI.piiDetection.score >= 90 ? 'bg-green-500' : 'bg-orange-500'}`}
                        style={{ width: `${item.advancedAI.piiDetection.score}%` }}
                      />
                    </div>
                    {item.advancedAI.piiDetection.found && item.advancedAI.piiDetection.details.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-orange-700 mb-2">⚠️ Personal Information Detected:</p>
                        <ul className="space-y-2">
                          {item.advancedAI.piiDetection.details.map((pii, idx) => (
                            <li key={idx} className="text-xs bg-white rounded-lg p-2 border border-orange-200">
                              <div className="flex items-start justify-between mb-1">
                                <span className="font-semibold text-gray-700 capitalize">{pii.type}</span>
                                <span className="text-gray-500">{Math.round(pii.confidence * 100)}% confidence</span>
                              </div>
                              <div className="text-gray-600">
                                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{pii.value}</span>
                                {pii.location && <span className="ml-2">· {pii.location}</span>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-green-700 flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5" />
                        No personal information detected
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Difficulty Analysis */}
              {item.detectedMetadata.difficultyLevel && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Difficulty Analysis
                  </h3>
                  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Difficulty Level</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.detectedMetadata.difficultyLevel === 'beginner' ? 'bg-green-100 text-green-700' :
                        item.detectedMetadata.difficultyLevel === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.detectedMetadata.difficultyLevel?.toUpperCase()}
                      </span>
                    </div>
                    {item.detectedMetadata.difficultyScore && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600">Complexity Score</span>
                          <span className="text-xs font-bold text-gray-900">{item.detectedMetadata.difficultyScore}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.detectedMetadata.difficultyScore <= 3 ? 'bg-green-500' :
                              item.detectedMetadata.difficultyScore <= 7 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${item.detectedMetadata.difficultyScore * 10}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {item.detectedMetadata.difficultyReasoning && (
                      <div className="pt-3 border-t border-cyan-200">
                        <p className="text-xs text-gray-700">{item.detectedMetadata.difficultyReasoning}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Learning Objectives */}
              {item.advancedAI.learningObjectives && item.advancedAI.learningObjectives.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Learning Objectives
                  </h3>
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                    {item.advancedAI.bloomLevel && (
                      <div className="mb-3">
                        <span className="text-xs font-semibold text-gray-600">Bloom's Taxonomy Level:</span>
                        <span className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold uppercase">
                          {item.advancedAI.bloomLevel}
                        </span>
                      </div>
                    )}
                    <ul className="space-y-2">
                      {item.advancedAI.learningObjectives.map((objective, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <ChevronRight className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Duplicate Detection */}
              {item.advancedAI.duplicateDetection && item.advancedAI.duplicateDetection.checkCompleted && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Duplicate Detection
                  </h3>
                  <div className={`border rounded-xl p-4 ${
                    item.advancedAI.duplicateDetection.isDuplicate 
                      ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200'
                      : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                  }`}>
                    {item.advancedAI.duplicateDetection.isDuplicate ? (
                      <div>
                        <div className="flex items-start gap-2 mb-3">
                          <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-orange-900 mb-1">Duplicate Detected</p>
                            <p className="text-xs text-orange-700">
                              This document is very similar to an existing resource in the library
                            </p>
                          </div>
                        </div>
                        {item.advancedAI.duplicateDetection.similarityScore && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className="font-medium text-gray-700">Similarity Score</span>
                              <span className="font-bold text-orange-900">
                                {(item.advancedAI.duplicateDetection.similarityScore * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
                                style={{ width: `${item.advancedAI.duplicateDetection.similarityScore * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {item.advancedAI.duplicateDetection.duplicateOfId && (
                          <div className="bg-white rounded-lg p-2 border border-orange-200">
                            <p className="text-xs text-gray-600">Similar to document:</p>
                            <p className="text-xs font-mono text-gray-800 mt-1">
                              {item.advancedAI.duplicateDetection.duplicateOfId}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-green-900 mb-1">Unique Document</p>
                          <p className="text-xs text-green-700">
                            No similar documents found in the library
                          </p>
                          {item.advancedAI.duplicateDetection.similarityScore !== null && 
                           item.advancedAI.duplicateDetection.similarityScore > 0 && (
                            <p className="text-xs text-gray-600 mt-2">
                              Highest similarity: {(item.advancedAI.duplicateDetection.similarityScore * 100).toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Detected Issues by Category */}
          {categorizedIssues.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Detected Issues
              </h3>

              {categorizedIssues.map(([category, issues]) => (
                <div key={category} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    {category}
                  </h4>
                  <ul className="space-y-2">
                    {issues.map((issue, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <span className="mt-0.5">{getSeverityIcon(issue.severity)}</span>
                        <div className="flex-1">
                          <p className="text-gray-700">{issue.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Severity: <span className="font-medium capitalize">{issue.severity}</span>
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Processing Timeline */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Processing Timeline
            </h3>
            <div className="relative pl-6 space-y-3">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />
              {[
                { label: 'Uploaded', done: true },
                { label: 'File Validation', done: true },
                { label: 'OCR Processing', done: true },
                { label: 'AI Analysis', done: true },
                { label: 'Safety Check', done: true },
                { label: 'Awaiting Review', done: false }
              ].map((step, idx) => (
                <div key={idx} className="relative flex items-center gap-3">
                  <div
                    className={`absolute left-[-22px] w-4 h-4 rounded-full border-2 ${
                      step.done
                        ? 'bg-green-500 border-green-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {step.done && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-sm ${step.done ? 'text-gray-700' : 'text-gray-500 font-medium'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
          <div className="flex gap-3">
            <button
              onClick={() => setShowApproveModal(true)}
              disabled={actionLoading}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => setShowChangesModal(true)}
              disabled={actionLoading}
              className="flex-1 px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Request Changes
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Approve Document</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to approve this document? It will be published to the library.
            </p>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Optional admin notes..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-4 resize-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-semibold"
              >
                {actionLoading ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Document</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select reasons for rejection:
            </p>
            <div className="space-y-2 mb-4">
              {['Low Quality', 'Inappropriate Content', 'Copyright Issues', 'Incorrect Category', 'Malware Detected', 'Poor Formatting'].map(reason => (
                <label key={reason} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rejectReason.includes(reason)}
                    onChange={() => toggleRejectReason(reason)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{reason}</span>
                </label>
              ))}
            </div>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Additional notes or custom reason..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-4 resize-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason([]); setCustomMessage(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || (rejectReason.length === 0 && !customMessage)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-semibold"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {showChangesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Request Changes</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select what changes are needed:
            </p>
            <div className="space-y-2 mb-4">
              {['Fix OCR Errors', 'Improve Formatting', 'Update Metadata', 'Correct Category', 'Better Image Quality', 'Remove Duplicate Content'].map(change => (
                <label key={change} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={changesNeeded.includes(change)}
                    onChange={() => toggleChangeNeeded(change)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{change}</span>
                </label>
              ))}
            </div>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Additional instructions..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-4 resize-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowChangesModal(false); setChangesNeeded([]); setCustomMessage(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestChanges}
                disabled={actionLoading || (changesNeeded.length === 0 && !customMessage)}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 text-sm font-semibold"
              >
                {actionLoading ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
