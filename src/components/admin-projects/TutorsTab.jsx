import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, Plus, Trash2, User } from 'lucide-react';

export default function TutorsTab({ project }) {
  const [selectedTutor, setSelectedTutor] = useState('');
  const queryClient = useQueryClient();

  const { data: assignments = [] } = useQuery({
    queryKey: ['project-tutor-assignments', project.id],
    queryFn: () => base44.entities.ProjectTutorAssignment.filter({ project_id: project.id }),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const tutors = allUsers.filter(u => u.app_role === 'tutor');
  const assignedIds = new Set(assignments.map(a => a.tutor_user_id));
  const availableTutors = tutors.filter(t => !assignedIds.has(t.id));

  const assignMutation = useMutation({
    mutationFn: (tutorId) => base44.entities.ProjectTutorAssignment.create({
      project_id: project.id,
      tutor_user_id: tutorId,
      assigned_date: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tutor-assignments', project.id] });
      setSelectedTutor('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (assignmentId) => base44.entities.ProjectTutorAssignment.delete(assignmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-tutor-assignments', project.id] }),
  });

  const getTutorName = (id) => allUsers.find(u => u.id === id)?.full_name || 'Unknown';
  const getTutorEmail = (id) => allUsers.find(u => u.id === id)?.email || '';

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-1">Assign Reviewer Tutor</h3>
        <p className="text-sm text-slate-500 mb-4">Only tutors assigned here can approve or reject submissions for this project.</p>
        <div className="flex gap-3">
          <Select value={selectedTutor} onValueChange={setSelectedTutor}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a tutor..." />
            </SelectTrigger>
            <SelectContent>
              {availableTutors.length === 0
                ? <SelectItem value="none" disabled>All tutors already assigned</SelectItem>
                : availableTutors.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name} — {t.email}</SelectItem>)
              }
            </SelectContent>
          </Select>
          <Button onClick={() => assignMutation.mutate(selectedTutor)} disabled={!selectedTutor || assignMutation.isPending} className="gap-1">
            <Plus className="w-4 h-4" /> Assign
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {assignments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400 text-sm">
            No tutors assigned yet.
          </div>
        ) : assignments.map(a => (
          <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm">{getTutorName(a.tutor_user_id)}</p>
              <p className="text-xs text-slate-400">{getTutorEmail(a.tutor_user_id)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { if (confirm('Remove this tutor?')) removeMutation.mutate(a.id); }}
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}