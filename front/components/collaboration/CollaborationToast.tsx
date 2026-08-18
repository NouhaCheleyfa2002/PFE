"use client";

import { useEffect } from "react";
import { useWebSocket } from "@/lib/websocket-context";
import { toast } from "react-hot-toast";
import { UserPlus, Trash2, Edit3, ArrowUpDown } from "lucide-react";

interface CollaborationToastProps {
  examId: string;
  currentUserId: string;
}

export default function CollaborationToast({ examId, currentUserId }: CollaborationToastProps) {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected || !examId) return;

    const handleQuestionAdded = (data: any) => {
      if (data.userId === currentUserId) return; // Don't show for own actions
      
      toast.success(
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          <span><strong>{data.userName}</strong> added a question</span>
        </div>,
        { duration: 3000 }
      );
    };

    const handleQuestionRemoved = (data: any) => {
      if (data.userId === currentUserId) return;
      
      toast.error(
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          <span><strong>{data.userName}</strong> removed a question</span>
        </div>,
        { duration: 3000 }
      );
    };

    const handleQuestionUpdated = (data: any) => {
      if (data.userId === currentUserId) return;
      
      toast(
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4" />
          <span><strong>{data.userName}</strong> updated a question</span>
        </div>,
        { duration: 2000, icon: '✏️' }
      );
    };

    const handleQuestionsReordered = (data: any) => {
      if (data.userId === currentUserId) return;
      
      toast(
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4" />
          <span><strong>{data.userName}</strong> reordered questions</span>
        </div>,
        { duration: 2000, icon: '🔄' }
      );
    };

    const handleMetadataUpdated = (data: any) => {
      if (data.userId === currentUserId) return;
      
      const fieldLabels: Record<string, string> = {
        title: 'title',
        subject: 'subject',
        classLevel: 'class level',
        duration: 'duration',
        instructions: 'instructions',
      };
      
      toast(
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4" />
          <span><strong>{data.userName}</strong> updated {fieldLabels[data.field] || data.field}</span>
        </div>,
        { duration: 2000, icon: '📝' }
      );
    };

    socket.on('exam:question_added', handleQuestionAdded);
    socket.on('exam:question_removed', handleQuestionRemoved);
    socket.on('question:updated', handleQuestionUpdated);
    socket.on('exam:questions_reordered', handleQuestionsReordered);
    socket.on('exam:metadata_updated', handleMetadataUpdated);

    return () => {
      socket.off('exam:question_added', handleQuestionAdded);
      socket.off('exam:question_removed', handleQuestionRemoved);
      socket.off('question:updated', handleQuestionUpdated);
      socket.off('exam:questions_reordered', handleQuestionsReordered);
      socket.off('exam:metadata_updated', handleMetadataUpdated);
    };
  }, [socket, isConnected, examId, currentUserId]);

  return null; // This component only handles side effects
}
