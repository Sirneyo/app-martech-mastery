import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function TutorAssignmentSubmissions() {
  const [statusFilter, setStatusFilter] = useState('submitted');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['tutor-cohort-assignments'],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.TutorCohortAssignment.filter({ tutor_id: user.id });
    },
    enabled: !!user?.id,
  });

  const cohortIds = assignments.map(a => a.cohort_id);

  const { data: submissions = [] } = useQuery({
    queryKey: ['assignment-submissions', cohortIds, statusFilter],
    queryFn: async () => {
      if (cohortIds.length === 0) return [];
      
      const memberships = await base44.entities.CohortMembership.list();
      const studentIds = memberships
        .filter(m => cohortIds.includes(m.cohort_id))
        .map(m => m.user_id);
      
      const allSubmissions = await base44.entities.Submission.filter({ submission_kind: 'assignment' });
      let filtered = allSubmissions.filter(s => studentIds.includes(s.user_id));
      
      if (statusFilter !== 'all') {
        if (statusFilter === 'submitted') {
          filtered = filtered.filter(s => s.status === 'submitted' || s.status === 'in_review');
        } else {
          filtered = filtered.filter(s => s.status === statusFilter);
        }
      }
      
      return filtered.sort((a, b) => new Date(a.submitted_date) - new Date(b.submitted_date));
    },
    enabled: cohortIds.length > 0,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['assignment-templates'],
    queryFn: () => base44.entities.AssignmentTemplate.list(),
  });

  const getStudentName = (userId) => {
    const student = students.find(s => s.id === userId);
    return student?.full_name || 'Unknown Student';
  };

  const getTemplateName = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    return template?.title || 'Unknown Assignment';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Assignment Submissions</h1>
            <p className="text-slate-500 mt-1">Review and grade student assignments</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="submitted">Pending Review</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
              <SelectItem value="needs_revision">Needs Revision</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <div className="space-y-3">
        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <p className="text-slate-500">No submissions to review</p>
          </div>
        ) : (
          submissions.map((submission, index) => (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={createPageUrl(`TutorSubmissionReview?id=${submission.id}`)}
                className="block bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-slate-900">{getTemplateName(submission.assignment_template_id)}</h3>
                      <Badge className={
                        submission.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                        submission.status === 'graded' ? 'bg-green-100 text-green-700' :
                        submission.status === 'needs_revision' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }>
                        {submission.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{getStudentName(submission.user_id)}</p>
                    {submission.submitted_date && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        Submitted {format(new Date(submission.submitted_date), 'MMM d, yyyy h:mm a')}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}