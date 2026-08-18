"use client";

import { useRef, ReactNode, useState, useEffect } from "react";
import {
  FileText,
  Trash2,
  Eye,
  Pencil,
  AlertTriangle,
  Cloud,
  Loader2,
  GraduationCap,
  Layout,
  X,
  Users,
  Sparkles,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { ExamProvider, useExam, PreviewMode } from "@/lib/exam-context";
import { EDUCATION_LEVELS, type EducationLevel } from "@/lib/education-config";
import QuestionBank from "@/components/exam-builder/QuestionBank";
import ExamPreview from "@/components/exam-builder/ExamPreview";
import { TemplateSelectionModal } from "@/components/templates/TemplateSelectionModal";
import { type TemplateResponse } from "@/lib/api/templates";
import { ActivityFeed, CollaboratorManager, CollaborationSidebar } from "@/components/collaboration";
import CollaborationToast from "@/components/collaboration/CollaborationToast";
import WebSocketDebugPanel from "@/components/collaboration/WebSocketDebugPanel";
import { useWebSocket } from "@/lib/websocket-context";
import AIExamGeneratorWizard from "@/components/ai/AIExamGeneratorWizard";

/* ─── Save indicator ───────────────────────────────────────────────────────── */

function SaveIndicator() {
  const { savedAt, isSaving } = useExam();

  if (isSaving) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[#aab4cc]">
        <Loader2 className="w-3 h-3 animate-spin" />
        Saving…
      </span>
    );
  }

  if (savedAt) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[#aab4cc]">
        <Cloud className="w-3 h-3" />
        Saved{" "}
        {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }

  return null;
}

/* ─── Preview mode toggle ──────────────────────────────────────────────────── */

const MODES: { id: PreviewMode; label: string; icon: ReactNode }[] = [
  { id: "edit", label: "Edit", icon: <Pencil className="w-3.5 h-3.5" /> },
  { id: "student", label: "Student view", icon: <Eye className="w-3.5 h-3.5" /> },
];

function PreviewModeToggle() {
  const { previewMode, setPreviewMode } = useExam();

  return (
    <div className="flex items-center rounded-lg border border-[#edf0f7] overflow-hidden bg-[#f9faff] p-0.5 gap-0.5">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => setPreviewMode(m.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            previewMode === m.id
              ? "bg-white text-[#0d1b3e] shadow-sm"
              : "text-[#8899bb] hover:text-[#0d1b3e]"
          }`}
        >
          {m.icon}
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Validation summary ───────────────────────────────────────────────────── */

function ValidationBadge() {
  const { validationErrors } = useExam();
  const count = Object.keys(validationErrors).length;
  if (!count) return null;

  return (
    <span
      title={Object.values(validationErrors).flat().join("\n")}
      className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg cursor-help"
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      {count} issue{count !== 1 && "s"}
    </span>
  );
}

/* ─── Inner builder ────────────────────────────────────────────────────────── */

function ExamBuilderInner() {
  const previewRef = useRef<HTMLDivElement>(null);
  const { 
    exam, 
    clearExam, 
    totalPoints, 
    pointsRemaining, 
    previewMode, 
    setClassLevel, 
    setTemplateId, 
    setMaxPoints, 
    setExamId,
    setTitle,
    setSubject,
    setDuration,
    setInstructions,
    addQuestion,
    setWebSocket,
  } = useExam();
  const isEditorMode = previewMode === "edit";
  const { joinExam, leaveExam, isConnected, socket } = useWebSocket();
  
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null);
  const [importedTemplate, setImportedTemplate] = useState<TemplateResponse | null>(null);
  const [showMaxPointsInput, setShowMaxPointsInput] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showAIWizard, setShowAIWizard] = useState(false);
  
  // Workspace/Exam management
  const [availableExams, setAvailableExams] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [currentExamId, setCurrentExamId] = useState<string>("");

  // Get user info for collaboration
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [isOwner, setIsOwner] = useState<boolean>(false);

  useEffect(() => {
    // Get user info from localStorage or API
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub || payload.userId || "";
        setUserId(userId);
        
        // Try different variations of name field - prioritize fullName
        const name = payload.fullName || payload['fullName'] || payload.name || payload.username || 'User';
        setUserName(name);
        
        console.log('[ExamBuilder] User info from token:', { 
          userId, 
          userName: name, 
          rawPayload: payload,
          availableFields: Object.keys(payload)
        });
      } catch (err) {
        console.error('[ExamBuilder] Failed to parse token:', err);
      }
    }
    
    // Check if user is owner (for now, assume true if they're viewing)
    // In real implementation, check against exam.ownerId
    setIsOwner(true);
    
    // Load available exams
    loadAvailableExams();

    // Check URL for examId parameter
    const urlParams = new URLSearchParams(window.location.search);
    const examIdFromUrl = urlParams.get('examId');
    console.log('[ExamBuilder] URL parameters:', { examIdFromUrl, fullUrl: window.location.href });
    
    if (examIdFromUrl && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(examIdFromUrl)) {
      console.log('[ExamBuilder] Loading exam from URL:', examIdFromUrl);
      loadExam(examIdFromUrl);
    } else if (examIdFromUrl) {
      console.warn('[ExamBuilder] Invalid exam ID format in URL:', examIdFromUrl);
    }
  }, []);

  // Pass WebSocket to exam context for real-time updates
  useEffect(() => {
    setWebSocket(socket);
  }, [socket, setWebSocket]);

  // Join exam collaboration session when exam ID changes
  useEffect(() => {
    // Use exam.id from context if currentExamId not set
    const activeExamId = currentExamId || exam.id;
    
    if (activeExamId && isConnected && userName) {
      // Validate it's a real UUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeExamId)) {
        console.log(`Joining exam collaboration session: ${activeExamId}`);
        joinExam(activeExamId, userName);

        // Leave exam when component unmounts or exam changes
        return () => {
          console.log(`Leaving exam collaboration session: ${activeExamId}`);
          leaveExam(activeExamId);
        };
      }
    }
  }, [currentExamId, exam.id, isConnected, userName, joinExam, leaveExam]);

  const loadAvailableExams = async () => {
    setLoadingExams(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3000/exams', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Exams API response:', data);
        
        // Handle both array and paginated responses
        let exams;
        if (Array.isArray(data)) {
          exams = data;
        } else if (data.exams && Array.isArray(data.exams)) {
          // Paginated response
          exams = data.exams;
        } else {
          console.warn('Unexpected exams response format:', data);
          setAvailableExams([]);
          return;
        }
        
        // Ensure exams is an array
        if (Array.isArray(exams)) {
          console.log(`Loaded ${exams.length} exams:`, exams.map(e => ({ id: e.id, title: e.title })));
          setAvailableExams(exams);
        } else {
          console.warn('Exams is not an array:', exams);
          setAvailableExams([]);
        }
      } else {
        console.error('Failed to load exams:', response.status);
        setAvailableExams([]);
      }
    } catch (error) {
      console.error('Failed to load exams:', error);
      setAvailableExams([]);
    } finally {
      setLoadingExams(false);
    }
  };

  const loadExam = async (examId: string) => {
    console.log('Loading exam with ID:', examId);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please login to access exams');
        return;
      }

      const response = await fetch(`http://localhost:3000/exams/${examId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      console.log('Load exam response status:', response.status);
      
      if (response.ok) {
        const examData = await response.json();
        console.log('Loaded exam data:', examData);
        
        // Set current exam ID for collaboration
        setCurrentExamId(examData.id);
        
        // Update URL with exam ID
        window.history.pushState({}, '', `/dashboard/exam-builder?examId=${examData.id}`);
        
        // Load exam metadata into context
        setExamId(examData.id);
        setTitle(examData.title || '');
        setClassLevel(examData.classLevel || '');
        setSubject(examData.subject || '');
        setDuration(examData.duration?.toString() || '');
        setInstructions(examData.instructions || '');
        setMaxPoints(examData.maxPoints || null);
        setTemplateId(examData.templateId || null);
        
        // Load questions if they exist
        if (Array.isArray(examData.questions) && examData.questions.length > 0) {
          // Clear existing questions first
          clearExam();
          
          // Re-set metadata after clear
          setExamId(examData.id);
          setTitle(examData.title || '');
          setClassLevel(examData.classLevel || '');
          setSubject(examData.subject || '');
          setDuration(examData.duration?.toString() || '');
          setInstructions(examData.instructions || '');
          setMaxPoints(examData.maxPoints || null);
          
          // Add each question
          examData.questions.forEach((question: any) => {
            addQuestion(question);
          });
          
          console.log(`Loaded ${examData.questions.length} questions`);
        }
        
        toast.success(`Exam "${examData.title || 'Untitled'}" loaded successfully`);
      } else if (response.status === 404) {
        console.error('Exam not found with ID:', examId);
        toast.error('Exam not found. It may have been deleted.');
        // Clear the invalid exam ID from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('examId');
        window.history.replaceState({}, '', url.toString());
      } else if (response.status === 403) {
        console.error('Access denied to exam:', examId);
        toast.error('You do not have permission to access this exam.');
        // Clear the unauthorized exam ID from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('examId');
        window.history.replaceState({}, '', url.toString());
      } else {
        console.error('Failed to load exam:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
        toast.error('Failed to load exam');
        // Clear the problematic exam ID from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('examId');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error) {
      console.error('Failed to load exam:', error);
      toast.error('Failed to load exam. Please try again.');
    }
  };

  // Don't force template selection on load - let user choose when they want

  const handleSelectTemplate = (template: TemplateResponse) => {
    console.log('[ExamBuilder] Template selected:', {
      hasId: !!template.id,
      name: template.name,
      hasLogoUrl: !!template.logoUrl,
      logoWidth: template.logoPosition?.width
    });
    
    // If template has an ID, it's a saved template - use the ID
    // If template has no ID, it's imported - store it in state
    if (template.id) {
      setTemplateId(template.id);
      setImportedTemplate(null); // Clear imported template
    } else {
      setTemplateId(null); // Imported template - no ID
      setImportedTemplate(template); // Store imported template data
    }
    setSelectedTemplateName(template.name);
    setShowTemplateModal(false);
  };

  const handleSelectDefault = async () => {
    try {
      const { getDefaultTemplate } = await import("@/lib/api/templates");
      const defaultTemplate = await getDefaultTemplate();
      
      if (defaultTemplate) {
        setTemplateId(defaultTemplate.id);
        setSelectedTemplateName(defaultTemplate.name);
      } else {
        setTemplateId(null);
        setSelectedTemplateName("Default Template");
      }
      
      setShowTemplateModal(false);
    } catch (error) {
      console.error("Failed to load default template:", error);
      setTemplateId(null);
      setSelectedTemplateName("Default Template");
      setShowTemplateModal(false);
    }
  };

  const handleSaveExam = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      toast.error('Please login to save exams');
      return;
    }

    if (!exam.title || exam.questions.length === 0) {
      toast.error('Please add a title and at least one question');
      return;
    }

    setIsSavingToDb(true);
    const savingToast = toast.loading('Saving exam...');
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      
      // Only use PUT if we have a valid UUID
      const isValidUUID = exam.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exam.id);
      const url = isValidUUID ? `${API_URL}/exams/${exam.id}` : `${API_URL}/exams`;
      const method = isValidUUID ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: exam.title,
          classLevel: exam.classLevel,
          subject: exam.subject,
          duration: exam.duration,
          instructions: exam.instructions,
          questions: exam.questions,
          templateId: exam.templateId,
          maxPoints: exam.maxPoints,
        }),
      });

      if (response.ok) {
        const savedExam = await response.json();
        setExamId(savedExam.id);
        setCurrentExamId(savedExam.id);
        
        // Update URL with exam ID
        window.history.pushState({}, '', `/dashboard/exam-builder?examId=${savedExam.id}`);
        
        toast.success(
          isValidUUID ? 'Exam updated successfully!' : 'Exam created successfully!',
          { id: savingToast, duration: 3000 }
        );
      } else {
        const error = await response.json();
        toast.error(`Failed to save exam: ${error.message || 'Unknown error'}`, { id: savingToast });
      }
    } catch (error) {
      console.error('Failed to save exam:', error);
      toast.error('Failed to save exam. Please try again.', { id: savingToast });
    } finally {
      setIsSavingToDb(false);
    }
  };

  const handleCreateNewTemplate = () => {
    setShowTemplateModal(false);
    window.open("/dashboard/templates", "_blank");
  };

  const handleChangeTemplate = () => {
    setShowTemplateModal(true);
  };

  const handleExportPDF = async () => {
    if (!previewRef.current) return;

    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      let pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // If a template is selected, apply it
      if (exam.templateId) {
        const { getTemplateById } = await import("@/lib/api/templates");
        try {
          const template = await getTemplateById(exam.templateId);
          
          // Apply template header
          let yOffset = 10;
          
          // Add logo if present
          if (template.logoUrl) {
            try {
              const logoImg = await loadImage(template.logoUrl);
              const logoX = template.logoPosition?.x || 10;
              const logoY = template.logoPosition?.y || 10;
              const logoWidth = template.logoPosition?.width || 30;
              const logoHeight = template.logoPosition?.height || 20;
              pdf.addImage(logoImg, "PNG", logoX, logoY, logoWidth, logoHeight);
              yOffset = Math.max(yOffset, logoY + logoHeight + 5);
            } catch (err) {
              console.warn("Failed to load logo:", err);
            }
          }

          // Add institution metadata
          pdf.setFontSize(14);
          pdf.setFont(template.fontFamily || "helvetica", "bold");
          if (template.institutionName) {
            pdf.text(template.institutionName, pdfWidth / 2, yOffset, { align: "center" });
            yOffset += 7;
          }

          pdf.setFontSize(10);
          pdf.setFont(template.fontFamily || "helvetica", "normal");
          if (template.institutionAddress) {
            pdf.text(template.institutionAddress, pdfWidth / 2, yOffset, { align: "center" });
            yOffset += 5;
          }
          if (template.contactPhone || template.contactEmail) {
            const contact = [template.contactPhone, template.contactEmail].filter(Boolean).join(" • ");
            pdf.text(contact, pdfWidth / 2, yOffset, { align: "center" });
            yOffset += 5;
          }
          if (template.academicYear) {
            pdf.text(`Academic Year: ${template.academicYear}`, pdfWidth / 2, yOffset, { align: "center" });
            yOffset += 8;
          }

          // Add separator line
          pdf.setDrawColor(200, 200, 200);
          pdf.line(15, yOffset, pdfWidth - 15, yOffset);
          yOffset += 10;

          // Render exam content
          const canvas = await html2canvas(previewRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
          });

          const imgData = canvas.toDataURL("image/png");
          const ratio = pdfWidth / canvas.width;
          const scaledHeight = canvas.height * ratio;
          const availableHeight = pdfHeight - yOffset - 10;

          let contentPosition = 0;
          let remaining = scaledHeight;
          let isFirstPage = true;

          while (remaining > 0) {
            if (!isFirstPage) {
              pdf.addPage();
              yOffset = 10;
            }
            const pageHeight = isFirstPage ? availableHeight : pdfHeight - 20;
            pdf.addImage(imgData, "PNG", 0, yOffset - contentPosition, pdfWidth, scaledHeight);
            contentPosition += pageHeight;
            remaining -= pageHeight;
            isFirstPage = false;
          }

          // Add watermark if present
          if (template.watermarkText) {
            const totalPages = pdf.internal.pages.length - 1;
            pdf.setFontSize(50);
            pdf.setTextColor(200, 200, 200);
            pdf.setFont(template.fontFamily || "helvetica", "bold");
            for (let i = 1; i <= totalPages; i++) {
              pdf.setPage(i);
              pdf.saveGraphicsState();
              const gstate = new (pdf as any).GState({ opacity: template.watermarkOpacity || 0.1 });
              pdf.setGState(gstate);
              pdf.text(template.watermarkText, pdfWidth / 2, pdfHeight / 2, {
                align: "center",
                angle: 45,
              });
              pdf.restoreGraphicsState();
            }
          }

          // Add footer if present
          if (template.footerText) {
            const totalPages = pdf.internal.pages.length - 1;
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.setFont(template.fontFamily || "helvetica", "normal");
            for (let i = 1; i <= totalPages; i++) {
              pdf.setPage(i);
              pdf.text(template.footerText, pdfWidth / 2, pdfHeight - 10, { align: "center" });
            }
          }
        } catch (error) {
          console.error("Failed to apply template, using default export:", error);
          // Fall back to default export
          await exportWithoutTemplate(pdf, previewRef.current, html2canvas, pdfWidth, pdfHeight);
        }
      } else {
        // No template selected, use default export
        await exportWithoutTemplate(pdf, previewRef.current, html2canvas, pdfWidth, pdfHeight);
      }

      pdf.save(`${exam.title || "exam"}.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Failed to export PDF. Please try again.");
    }
  };

  const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } else {
          reject(new Error("Failed to get canvas context"));
        }
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const exportWithoutTemplate = async (
    pdf: any,
    element: HTMLDivElement,
    html2canvas: any,
    pdfWidth: number,
    pdfHeight: number
  ) => {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const ratio = pdfWidth / canvas.width;
    const scaledHeight = canvas.height * ratio;

    let position = 0;
    let remaining = scaledHeight;
    let isFirst = true;
    while (remaining > 0) {
      if (!isFirst) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -position, pdfWidth, scaledHeight);
      position += pdfHeight;
      remaining -= pdfHeight;
      isFirst = false;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* AI Exam Generator Wizard */}
      <AIExamGeneratorWizard
        isOpen={showAIWizard}
        onClose={() => setShowAIWizard(false)}
        onExamGenerated={(generatedExam) => {
          // TODO: Populate exam with generated content
          toast.success('Exam generated successfully!');
          setShowAIWizard(false);
        }}
      />

      {/* Template Selection Modal */}
      <TemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectDefault={handleSelectDefault}
        onSelectTemplate={handleSelectTemplate}
        onCreateNew={handleCreateNewTemplate}
      />

      {/* Collaborators Modal */}
      {showCollaborators && exam.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exam.id) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Manage Collaborators</h2>
              </div>
              <button
                onClick={() => setShowCollaborators(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <CollaboratorManager
                resourceType="exam"
                resourceId={exam.id}
                currentUserId={userId}
                isOwner={isOwner}
              />
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex-1 flex items-center gap-4">
          <div>
            <h1
              style={{ fontFamily: "var(--font-heading), sans-serif" }}
              className="text-2xl font-bold text-[#0d1b3e]"
            >
              Exam Builder
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-sm text-[#8899bb]">
                {exam.questions.length} question{exam.questions.length !== 1 && "s"}
              </p>
              <span className="text-[#cbd5e1]">·</span>
            <div className="flex items-center gap-2">
              {exam.maxPoints ? (
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${
                    totalPoints > exam.maxPoints ? 'text-red-600' :
                    totalPoints === exam.maxPoints ? 'text-green-600' :
                    pointsRemaining <= 5 ? 'text-amber-600' :
                    'text-[#0d1b3e]'
                  }`}>
                    {totalPoints} / {exam.maxPoints} pts
                  </span>
                  {totalPoints > exam.maxPoints && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      Exceeded!
                    </span>
                  )}
                  {totalPoints === exam.maxPoints && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      Complete
                    </span>
                  )}
                  {totalPoints < exam.maxPoints && pointsRemaining <= 5 && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      {pointsRemaining} pts left
                    </span>
                  )}
                  <button
                    onClick={() => setMaxPoints(null)}
                    className="text-xs text-[#8899bb] hover:text-red-600 transition-colors"
                    title="Remove points limit"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : showMaxPointsInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Max points"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = parseInt((e.target as HTMLInputElement).value);
                        if (value > 0) {
                          setMaxPoints(value);
                          setShowMaxPointsInput(false);
                        }
                      } else if (e.key === 'Escape') {
                        setShowMaxPointsInput(false);
                      }
                    }}
                    className="w-24 px-2 py-1 text-sm border border-[#edf0f7] rounded focus:outline-none focus:border-[#63b3ed]"
                  />
                  <button
                    onClick={() => setShowMaxPointsInput(false)}
                    className="text-xs text-[#8899bb] hover:text-[#0d1b3e]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowMaxPointsInput(true)}
                  className="text-sm text-[#8899bb] hover:text-[#63b3ed] transition-colors flex items-center gap-1"
                >
                  {totalPoints} pts · <span className="text-xs underline">Set limit</span>
                </button>
              )}
            </div>
          </div>
          </div>
          
          {/* Workspace Selector - Always visible in edit mode */}
          {isEditorMode && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#0d1b3e]">Workspace:</span>
              <select
                value={currentExamId || exam.id || ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (selectedId === 'new') {
                    clearExam();
                    setCurrentExamId('');
                    // Update URL to remove examId
                    window.history.pushState({}, '', '/dashboard/exam-builder');
                  } else if (selectedId) {
                    loadExam(selectedId);
                    // Update URL with new examId
                    window.history.pushState({}, '', `/dashboard/exam-builder?examId=${selectedId}`);
                  }
                }}
                className="px-4 py-2 rounded-lg border-2 border-[#63b3ed] text-sm font-medium outline-none focus:border-[#4299e1] transition-all bg-white text-[#0d1b3e] min-w-[200px]"
              >
                <option value="">➕ New Exam</option>
                {Array.isArray(availableExams) && availableExams.length > 0 && <option disabled>──────────</option>}
                {Array.isArray(availableExams) && availableExams.map((availableExam) => (
                  <option key={availableExam.id} value={availableExam.id}>
                    {availableExam.title || `Untitled Exam`} {(availableExam.id === exam.id || availableExam.id === currentExamId) && '✓'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <SaveIndicator />
          <ValidationBadge />
          <PreviewModeToggle />

          {isEditorMode && (
            <>
              <button
                onClick={() => setShowAIWizard(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                <Sparkles className="w-4 h-4" /> AI Generate
              </button>
              
              <button
                onClick={handleSaveExam}
                disabled={isSavingToDb || exam.questions.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSavingToDb ? 'Saving...' : (exam.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exam.id)) ? 'Update Exam' : 'Save Exam'}
              </button>
              
              {/* Invite Collaborators Button - Only show for saved exams */}
              {exam.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exam.id) && (
                <button
                  onClick={() => setShowCollaborators(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#edf0f7] bg-white text-sm text-[#0d1b3e] hover:border-[#63b3ed] hover:bg-blue-50 transition-colors"
                >
                  <Users className="w-4 h-4" /> Collaborators
                </button>
              )}
              
              <button
                onClick={clearExam}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#edf0f7] text-sm text-[#8899bb] hover:border-red-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Clear
              </button>
            </>
          )}

          <button
            onClick={handleExportPDF}
            disabled={exam.questions.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0d1b3e] text-white text-sm font-medium hover:bg-[#1a2d5a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Collaboration Section */}
      {isEditorMode && exam.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exam.id) && userId && (
        <>
          {/* Real-time collaboration toast notifications */}
          <CollaborationToast examId={exam.id} currentUserId={userId} />
        </>
      )}

      {/* Live Comments Floating Button - REMOVED (using sidebar instead) */}

      {/* Collaboration Sidebar */}
      {isEditorMode && exam.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exam.id) && (
        <CollaborationSidebar 
          examId={currentExamId || exam.id}
          questions={exam.questions}
          onNavigateToElement={(elementId) => {
            console.log('Navigating to element:', elementId);
            const element = document.querySelector(`[data-element-id="${elementId}"]`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Add highlight flash effect
              element.classList.add('highlight-flash');
              setTimeout(() => {
                element.classList.remove('highlight-flash');
              }, 2000);
            } else {
              console.warn('Element not found:', elementId);
              // Debug: Log all elements with data-element-id
              const allElements = document.querySelectorAll('[data-element-id]');
              console.log('Available elements:', Array.from(allElements).map(el => el.getAttribute('data-element-id')));
            }
          }}
        />
      )}

      {/* Main panels */}
      <div className="flex-1 flex gap-4 min-h-0">
        {isEditorMode && <QuestionBank />}
        <ExamPreview 
          ref={previewRef} 
          importedTemplate={importedTemplate} 
          examId={currentExamId || exam.id || undefined}
        />
      </div>
      
      {/* WebSocket Debug Panel (Development only) */}
      {process.env.NODE_ENV === 'development' && exam.id && (
        <WebSocketDebugPanel />
      )}
    </div>
  );
}

export default function ExamBuilderPage() {
  return (
    <ExamProvider>
      <ExamBuilderInner />
    </ExamProvider>
  );
}
