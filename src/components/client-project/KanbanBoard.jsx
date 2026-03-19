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
  { id: 'approved',    label: 'Done',        color: 'bg-green-50', dot: 'bg-green-500', icon: CheckCircle },
];

const PRIORITY_BADGE = {
  high:   'bg-red-50 text-red-600 border border-red-100',
  medium: 'bg-amber-50 text-amber-600 border border-amber-100',
  low:    'bg-slate-50 text-slate-500 border border-slate-200',
};

function TaskCard({ task, submission, index, phases, onClick }) {
  const status = submission?.status || 'not_started';
  let subtasks = [];
  try { subtasks = JSON.parse(task.subtasks_json || '[]'); } catch {}
  let completedSubtasks = [];
  try { completedSubtasks = JSON.parse(submission?.subtasks_completed_json || '[]'); } catch {}
  const phase = phases.find(p => p.id === task.phase_id);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={onClick}
          className={`bg-white rounded-xl border border-slate-200 p-4 cursor-pointer select-none
            hover:border-teal-300 hover:shadow-md transition-all duration-150 group
            ${snapshot.isDragging ? 'shadow-xl border-teal-400 rotate-1' : ''}`}
        >
          <div className="flex items-start gap-2">
            <div
              {...provided.dragHandleProps}
              className="mt-0.5 text-slate-300 group-hover:text-slate-400 flex-shrink-0 cursor-grab active:cursor-grabbing"
              onClick={e => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              {phase && (
                <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide mb-1">{phase.title}</p>
              )}
              <p className="font-medium text-slate-900 text-sm leading-snug">{task.title}</p>
              {task.brief && (
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{task.brief}</p>
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

export default function KanbanBoard({ tasks, phases, submissions, enrollmentId, userId, projectId, onTaskClick }) {
  const queryClient = useQueryClient();

  const submissionMap = {};
  submissions.forEach(s => { submissionMap[s.task_id] = s; });

  const columns = {};
  COLUMNS.forEach(col => { columns[col.id] = []; });
  tasks.forEach(task => {
    const status = submissionMap[task.id]?.status || 'not_started';
    const col = columns[status] ? status : 'not_started';
    columns[col].push(task);
  });
  Object.keys(columns).forEach(col => {
    columns[col].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
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
    if (newStatus === currentStatus) return;
    updateSubmissionStatus.mutate({ taskId: draggableId, newStatus });
  }, [submissionMap]);

  return (
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
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-[200px] rounded-xl transition-colors duration-150 p-1
                      ${snapshot.isDraggingOver ? 'bg-teal-50/60 ring-2 ring-teal-200 ring-inset' : ''}`}
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
  );
}