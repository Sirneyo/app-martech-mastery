import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Clock, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function TutorAssignmentSubmissions() {
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [searchQuery, setSearchQuery] = useState('');
  const [cohortFilter, setCohortFilter] = useState('all');
  const [weekFilter, setWeekFilter] = useState('all');

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
      
      return filtered.sort((a, b) => new Date(b.submitted_date) - new Date(a.submitted_date));
    },
    enabled: cohortIds.length > 0,
  });

  const studentIds = submissions.map(s => s.user_id).filter((id, index, self) => self.indexOf(id) === index);

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students', studentIds],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const studentPromises = studentIds.map(id => 
        base44.functions.invoke('getStudentInfo', { userId: id })
          .then(res => res.data.student)
          .catch(() => null)
      );
      const results = await Promise.all(studentPromises);
      return results.filter(s => s !== null);
    },
    enabled: studentIds.length > 0,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['assignment-templates'],
    queryFn: () => base44.entities.AssignmentTemplate.list(),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts-for-tutor', cohortIds],
    queryFn: async () => {
      if (cohortIds.length === 0) return [];
      return base44.entities.Cohort.list();
    },
    enabled: cohortIds.length > 0,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['all-memberships'],
    queryFn: () => base44.entities.CohortMembership.list(),
  });

  const getStudentName = (userId) => {
    if (studentsLoading) return 'Loading...';
    const student = students.find(s => s.id === userId);
    return student?.data?.display_name || student?.full_name || student?.email || 'Unknown Student';
  };

  const getTemplateName = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    return template?.title || 'Unknown Assignment';
  };

  const getTemplateWeek = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    return template?.week_number;
  };

  const getStudentCohortId = (userId) => {
    const m = memberships.find(m => m.user_id === userId && cohortIds.includes(m.cohort_id));
    return m?.cohort_id;
  };

  const getCohortName = (cohortId) => {
    const cohort = cohorts.find(c => c.id === cohortId);
    return cohort?.name || cohortId;
  };

  const filteredSubmissions = submissions.filter(submission => {
    const studentName = getStudentName(submission.user_id).toLowerCase();
    const templateName = getTemplateName(submission.assignment_template_id).toLowerCase();
    const query = searchQuery.toLowerCase();
    const studentCohortId = getStudentCohortId(submission.user_id);
    const week = getTemplateWeek(submission.assignment_template_id);

    if (query && !studentName.includes(query) && !templateName.includes(query)) return false;
    if (cohortFilter !== 'all' && studentCohortId !== cohortFilter) return false;
    if (weekFilter !== 'all' && String(week) !== weekFilter) return false;
    return true;
  });

  const availableWeeks = [...new Set(templates.map(t => t.week_number).filter(Boolean))].sort((a, b) => a - b);

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

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by student or assignment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={cohortFilter} onValueChange={setCohortFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Cohorts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cohorts</SelectItem>
              {cohorts.filter(c => cohortIds.includes(c.id)).map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={weekFilter} onValueChange={setWeekFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Weeks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              {availableWeeks.map(w => (
                <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <div className="space-y-3">
        {filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <p className="text-slate-500">No submissions to review</p>
          </div>
        ) : (
          filteredSubmissions.map((submission, index) => (
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
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm text-slate-600">{getStudentName(submission.user_id)}</p>
                      {getStudentCohortId(submission.user_id) && (
                        <Badge variant="outline" className="text-xs">{getCohortName(getStudentCohortId(submission.user_id))}</Badge>
                      )}
                      {getTemplateWeek(submission.assignment_template_id) && (
                        <Badge variant="outline" className="text-xs">Week {getTemplateWeek(submission.assignment_template_id)}</Badge>
                      )}
                    </div>
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