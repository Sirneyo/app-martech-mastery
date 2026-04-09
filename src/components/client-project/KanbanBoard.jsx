import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Clock, PlayCircle, AlertCircle, CheckCircle,
  GripVertical, CheckSquare, MessageSquare, FileText, Link as LinkIcon, Upload
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const COLUMNS = [
  { id: 'not_started', label: 'To Do', color: 'bg-slate-100', dot: 'bg-slate-400', icon: Clock },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50', dot: 'bg-blue-500', icon: PlayCircle },
  { id: 'in_review',   label: 'In Review',  color: 'bg-amber-50', dot: 'bg-amber-500', icon: AlertCircle },
  { id: 'approved',    label: 'Completed',        color: 'bg-green-50', dot: 'bg-green-500', icon: CheckCircle },
];

const PRIORITY_BADGE = {
  high:   'bg-red-50 text-red-600 border border-red-100',
  medium: 'bg-amber-50 text-amber-600 border border-amber-100',
  low:    'bg-slate-50 text-slate-500 border border-slate-200',
};

function TaskCard({ task, submission, index, phases, onClick }) {
  const status = submission?.status || 'not_started';
  const isApproved = status === 'approved';
  let subtasks = [];
  try { subtasks = JSON.parse(task.subtasks_json || '[]'); } catch {}
  let completedSubtasks = [];
  try { completedSubtasks = JSON.parse(submission?.subtasks_completed_json || '[]'); } catch {}
  const phase = phases.find(p => p.id === task.phase_id);

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isApproved}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
              onClick={onClick}
              className={`bg-white rounded-xl border border-slate-200 p-4 cursor-pointer select-none
            hover:border-teal-300 hover:shadow-md transition-all duration-150 group
            ${snapshot.isDragging ? 'shadow-xl border-teal-400 rotate-1' : ''}
            ${isApproved ? 'opacity-70' : ''}`}
        >
          <div className="flex items-start gap-2">
            <div
              {...(!isApproved ? provided.dragHandleProps : {})}
              className={`mt-0.5 text-slate-300 flex-shrink-0 ${isApproved ? 'cursor-not-allowed opacity-30' : 'group-hover:text-slate-400 cursor-grab active:cursor-grabbing'}`}
              onClick={e => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              {phase && (
                <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide mb-1">{phase.title}</p>
              )}
              <p className="font-medium text-slate-900 text-sm leading-snug">{task.title}</p>
              {phase?.description && (
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{phase.description}</p>
              )}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {task.priority && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[task.priority]}`}>
                    {task.priority}
                  </span>
                )}
                {subtasks.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <CheckSquare className="w-3 h-3" />
                    {completedSubtasks.length}/{subtasks.length}
                  </span>
                )}
                {submission?.tutor_feedback && (
                  <span className="flex items-center gap-1 text-[10px] text-violet-500">
                    <MessageSquare className="w-3 h-3" />
                    Feedback
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function KanbanBoard({ tasks, phases, submissions, enrollmentId, userId, projectId, onTaskClick, onPendingStatusChange }) {
  const queryClient = useQueryClient();
  const [dragWarning, setDragWarning] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);

  const submissionMap = {};
  submissions.forEach(s => { submissionMap[s.task_id] = s; });

  const columns = {};
  COLUMNS.forEach(col => { columns[col.id] = []; });
  tasks.forEach(task => {
    const status = submissionMap[task.id]?.status || 'not_started';
    const col = columns[status] ? status : 'not_started';
    columns[col].push(task);
  });
  const PHASE_TITLE_ORDER = ['campaign', 'analytics', 'data management', 'operational'];
  const sortedPhases = [...phases].sort((a, b) => {
    const aTitle = a.title?.toLowerCase() || '';
    const bTitle = b.title?.toLowerCase() || '';
    const aIdx = PHASE_TITLE_ORDER.findIndex(k => aTitle.includes(k));
    const bIdx = PHASE_TITLE_ORDER.findIndex(k => bTitle.includes(k));
    const aOrder = aIdx === -1 ? 999 : aIdx;
    const bOrder = bIdx === -1 ? 999 : bIdx;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
  const phaseOrderMap = {};
  sortedPhases.forEach((p, i) => { phaseOrderMap[p.id] = i; });

  Object.keys(columns).forEach(col => {
    columns[col].sort((a, b) => {
      const phaseDiff = (phaseOrderMap[a.phase_id] ?? 0) - (phaseOrderMap[b.phase_id] ?? 0);
      if (phaseDiff !== 0) return phaseDiff;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  });

  const updateSubmissionStatus = useMutation({
    mutationFn: async ({ taskId, newStatus }) => {
      const existing = submissionMap[taskId];
      if (existing) {
        await base44.entities.TaskSubmission.update(existing.id, { status: newStatus });
      } else {
        await base44.entities.TaskSubmission.create({
          project_id: projectId,
          task_id: taskId,
          enrollment_id: enrollmentId,
          student_user_id: userId,
          status: newStatus,
          first_opened_date: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-task-submissions', projectId, userId] });
    },
  });

  const onDragEnd = useCallback((result) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    const currentStatus = submissionMap[draggableId]?.status || 'not_started';
    if (currentStatus === 'approved') return;
    if (newStatus === currentStatus) return;
    if (currentStatus === 'in_review') {
      setDragWarning('in-review-locked');
      return;
    }
    if (newStatus === 'approved') {
      setDragWarning('only-tutor');
      return;
    }
    if (newStatus === 'in_review') {
      setPendingStatus(draggableId);
      setDragWarning('in-review');
      return;
    }
    // Optimistically update local state for immediate UI feedback
    const newSubmissionMap = { ...submissionMap };
    if (newSubmissionMap[draggableId]) {
      newSubmissionMap[draggableId].status = newStatus;
    }
    updateSubmissionStatus.mutate({ taskId: draggableId, newStatus });
  }, [submissionMap])

  const handleConfirmInReview = () => {
    if (pendingStatus) {
      updateSubmissionStatus.mutate({ taskId: pendingStatus, newStatus: 'in_review' });
      setPendingStatus(null);
    }
    setDragWarning(null);
  };

  return (
    <>
      {dragWarning && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full mx-4 p-6">
          <h3 className="font-semibold text-slate-900 mb-2">
            {dragWarning === 'only-tutor' ? 'Completed by Reviewer Only' : dragWarning === 'in-review-locked' ? 'Cannot Move Task' : 'Submitting for Review'}
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            {dragWarning === 'only-tutor'
              ? 'Only your assigned reviewer can mark a task as Completed. You can move it to "In Review" when ready for assessment.'
              : dragWarning === 'in-review-locked'
              ? 'Once submitted for review, your task is locked. Only your reviewer can move it back to In Progress or mark it as Completed.'
              : 'Once submitted for review, you won\'t be able to make further changes until your reviewer has reviewed and provided feedback.'}
          </p>
          {dragWarning === 'in-review' ? (
            <div className="flex gap-3">
              <button
                onClick={() => { setPendingStatus(null); setDragWarning(null); }}
                className="flex-1 h-9 px-4 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmInReview}
                className="flex-1 h-9 px-4 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDragWarning(null)}
              className="w-full h-9 px-4 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition-colors"
            >
              Got it
            </button>
          )}
        </div>
      </div>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colTasks = columns[col.id] || [];
          const Icon = col.icon;
          return (
            <div key={col.id} className="flex-shrink-0 w-72">
              <div className={`rounded-xl ${col.color} px-4 py-3 mb-3 flex items-center gap-2`}>
                <Icon className="w-4 h-4 text-slate-600" />
                <span className="font-semibold text-slate-700 text-sm flex-1">{col.label}</span>
                <span className="text-xs font-bold text-slate-400 bg-white/60 rounded-full px-2 py-0.5">{colTasks.length}</span>
              </div>
              <Droppable droppableId={col.id} isDropDisabled={col.id === 'approved'}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-3 min-h-[200px] rounded-xl transition-colors duration-150 p-1
                    ${snapshot.isDraggingOver ? 'bg-teal-50/60 ring-2 ring-teal-200 ring-inset' : ''}
                    ${col.id === 'approved' ? 'opacity-60' : ''}`}
                >
                    {colTasks.map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        submission={submissionMap[task.id]}
                        index={index}
                        phases={phases}
                        onClick={() => onTaskClick(task, submissionMap[task.id])}
                      />
                    ))}
                    {provided.placeholder}
                    {colTasks.length === 0 && !snapshot.isDraggingOver && (
                      <div className="text-center py-8 text-slate-300 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                        Drop tasks here
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
        </div>
        </DragDropContext>
        </>
        );
}