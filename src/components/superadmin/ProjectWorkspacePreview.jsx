import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderKanban, User, ChevronRight, ChevronDown, CheckCircle, Clock, AlertTriangle, Play, Eye } from 'lucide-react';
import StudentProjectView from '@/components/superadmin/StudentProjectView';

export default function ProjectWorkspacePreview() {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['sim-projects'],
    queryFn: () => base44.entities.SimProject.filter({ status: 'active' }),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['sim-enrollments-all'],
    queryFn: () => base44.entities.SimProjectEnrollment.list(),
  });

  const students = allUsers.filter(u => u.app_role === 'student');

  const studentEnrollments = selectedStudentId
    ? enrollments.filter(e => e.student_user_id === selectedStudentId)
    : [];

  const getProject = (id) => projects.find(p => p.id === id);

  if (selectedEnrollment) {
    return (
      <StudentProjectView
        enrollment={selectedEnrollment}
        project={getProject(selectedEnrollment.project_id)}
        currentUser={allUsers.find(u => u.id === selectedEnrollment.student_user_id)}
        onBack={() => setSelectedEnrollment(null)}
        previewMode={true}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Eye className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Student Workspace Preview</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Select a student to preview exactly what they will see in their Project Workspace. This is not visible to students yet.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className="text-sm font-semibold text-slate-700 block mb-2">Preview as Student</label>
        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Select a student..." />
          </SelectTrigger>
          <SelectContent>
            {students.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedStudentId && (
        <div className="space-y-3">
          {studentEnrollments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400 text-sm">
              This student has no project enrolments yet.
            </div>
          ) : studentEnrollments.map(enrollment => {
            const project = getProject(enrollment.project_id);
            if (!project) return null;
            return (
              <div key={enrollment.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <FolderKanban className="w-6 h-6 text-violet-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 font-medium">{project.company_name}</p>
                  <p className="font-bold text-slate-900">{project.title}</p>
                  <Badge className={`mt-1 text-xs ${enrollment.status === 'active' ? 'bg-green-100 text-green-700' : enrollment.status === 'onboarding' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                    {enrollment.status}
                  </Badge>
                </div>
                <Button onClick={() => setSelectedEnrollment(enrollment)} className="gap-1.5">
                  <Play className="w-4 h-4" /> Preview Workspace
                </Button>
              </div>
            );
          })}

          {/* Show active projects this student is NOT enrolled in */}
          {projects.filter(p => !studentEnrollments.some(e => e.project_id === p.id)).map(project => (
            <div key={project.id} className="bg-white rounded-2xl border border-dashed border-slate-200 p-5 flex items-center gap-4 opacity-60">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <FolderKanban className="w-6 h-6 text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400 font-medium">{project.company_name}</p>
                <p className="font-bold text-slate-700">{project.title}</p>
                <p className="text-xs text-slate-400 mt-1">Student not enrolled</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}