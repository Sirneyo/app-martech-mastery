import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, Plus, Trash2, User } from 'lucide-react';

const STATUS_STYLES = {
  onboarding: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-violet-100 text-violet-700',
  withdrawn: 'bg-slate-100 text-slate-500',
};

export default function EnrollmentsTab({ project }) {
  const [mode, setMode] = useState('individual'); // 'individual' | 'cohort'
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTutor, setSelectedTutor] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('');
  const queryClient = useQueryClient();

  const { data: enrollments = [] } = useQuery({
    queryKey: ['sim-enrollments', project.id],
    queryFn: () => base44.entities.SimProjectEnrollment.filter({ project_id: project.id }),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => base44.entities.Cohort.list(),
  });

  const { data: cohortMemberships = [] } = useQuery({
    queryKey: ['cohort-memberships'],
    queryFn: () => base44.entities.CohortMembership.filter({ status: 'active' }),
  });

  const { data: tutorAssignments = [] } = useQuery({
    queryKey: ['sim-tutor-assignments', project.id],
    queryFn: () => base44.entities.SimProjectTutorAssignment.filter({ project_id: project.id }),
  });

  const students = allUsers.filter(u => u.app_role === 'student');
  const tutors = allUsers.filter(u => u.app_role === 'tutor');
  const assignedTutors = tutors.filter(t => tutorAssignments.some(a => a.tutor_user_id === t.id));
  const enrolledStudentIds = new Set(enrollments.map(e => e.student_user_id));
  const availableStudents = students.filter(s => !enrolledStudentIds.has(s.id));

  const enrollMutation = useMutation({
    mutationFn: async ({ studentIds, tutorId }) => {
      return Promise.all(studentIds.map(sid =>
        base44.entities.SimProjectEnrollment.create({
          project_id: project.id,
          student_user_id: sid,
          reviewer_tutor_id: tutorId,
          status: 'onboarding',
          enrolled_date: new Date().toISOString(),
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sim-enrollments', project.id] });
      setSelectedStudent('');
      setSelectedTutor('');
      setSelectedCohort('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.SimProjectEnrollment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sim-enrollments', project.id] }),
  });

  const handleEnrollIndividual = () => {
    if (!selectedStudent || !selectedTutor) return;
    enrollMutation.mutate({ studentIds: [selectedStudent], tutorId: selectedTutor });
  };

  const handleEnrollCohort = () => {
    if (!selectedCohort || !selectedTutor) return;
    const members = cohortMemberships.filter(m => m.cohort_id === selectedCohort);
    const studentIds = members.map(m => m.user_id).filter(id => !enrolledStudentIds.has(id));
    if (studentIds.length === 0) { alert('All students in this cohort are already enrolled.'); return; }
    enrollMutation.mutate({ studentIds, tutorId: selectedTutor });
  };

  const getName = (id) => allUsers.find(u => u.id === id)?.full_name || 'Unknown';
  const getEmail = (id) => allUsers.find(u => u.id === id)?.email || '';

  return (
    <div className="space-y-5">
      {/* Enrol Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-1">Enrol Students</h3>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setMode('individual')}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition ${mode === 'individual' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
          >Individual</button>
          <button
            onClick={() => setMode('cohort')}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition ${mode === 'cohort' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
          >By Cohort</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {mode === 'individual' ? (
            <div className="space-y-1">
              <Label>Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
                <SelectContent>
                  {availableStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Cohort</Label>
              <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                <SelectTrigger><SelectValue placeholder="Select cohort..." /></SelectTrigger>
                <SelectContent>
                  {cohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Assign Reviewer Tutor</Label>
            <Select value={selectedTutor} onValueChange={setSelectedTutor}>
              <SelectTrigger><SelectValue placeholder="Select tutor..." /></SelectTrigger>
              <SelectContent>
                {assignedTutors.length === 0
                  ? <SelectItem value="none" disabled>No tutors assigned to project</SelectItem>
                  : assignedTutors.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={mode === 'individual' ? handleEnrollIndividual : handleEnrollCohort}
          disabled={enrollMutation.isPending || !selectedTutor || (mode === 'individual' ? !selectedStudent : !selectedCohort)}
          className="gap-1"
        >
          <Plus className="w-4 h-4" /> {enrollMutation.isPending ? 'Enrolling...' : 'Enrol'}
        </Button>
      </div>

      {/* Enrolled List */}
      <div className="space-y-3">
        {enrollments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400 text-sm">
            No students enrolled yet.
          </div>
        ) : enrollments.map(e => (
          <div key={e.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm">{getName(e.student_user_id)}</p>
              <p className="text-xs text-slate-400">{getEmail(e.student_user_id)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Reviewer: {getName(e.reviewer_tutor_id)}</p>
            </div>
            <Badge className={STATUS_STYLES[e.status] || STATUS_STYLES.onboarding}>{e.status}</Badge>
            <Button variant="ghost" size="icon" onClick={() => { if (confirm('Remove this student?')) removeMutation.mutate(e.id); }}>
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}