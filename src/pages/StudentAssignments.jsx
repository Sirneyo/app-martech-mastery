import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, ChevronRight, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import AssignmentCountdown, { getAssignmentDates } from '@/components/AssignmentCountdown';

export default function StudentAssignments() {
  const impersonatingUser = (() => { try { return JSON.parse(sessionStorage.getItem('impersonatingUser') || 'null'); } catch { return null; } })();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const effectiveUserId = impersonatingUser?.id || user?.id;

  const { data: membership } = useQuery({
    queryKey: ['my-cohort-membership', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      const memberships = await base44.entities.CohortMembership.filter({ user_id: effectiveUserId, status: 'active' });
      return memberships[0];
    },
    enabled: !!effectiveUserId,
  });

  const { data: cohort } = useQuery({
    queryKey: ['cohort', membership?.cohort_id],
    queryFn: () => base44.entities.Cohort.filter({ id: membership.cohort_id }).then(r => r[0]),
    enabled: !!membership?.cohort_id,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignment-templates'],
    queryFn: () => base44.entities.AssignmentTemplate.list('week_number'),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['my-submissions', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      return base44.entities.Submission.filter({ user_id: effectiveUserId, submission_kind: 'assignment' });
    },
    enabled: !!effectiveUserId,
  });

  const { data: grades = [] } = useQuery({
    queryKey: ['my-grades', submissions.map(s => s.id).join(',')],
    queryFn: async () => {
      if (!effectiveUserId || submissions.length === 0) return [];
      // Fetch only grades for this student's submissions, not all grades platform-wide
      const gradePromises = submissions.map(s =>
        base44.entities.SubmissionGrade.filter({ submission_id: s.id })
      );
      const results = await Promise.all(gradePromises);
      return results.flat();
    },
    enabled: !!user?.id && submissions.length > 0,
  });

  const getSubmissionStatus = (assignmentId) => {
    const submission = submissions.find(s => s.assignment_template_id === assignmentId);
    if (!submission) return { status: 'not_started', label: 'Not Started', color: 'bg-slate-100 text-slate-600' };
    if (submission.status === 'draft') return { status: 'draft', label: 'Draft', color: 'bg-blue-100 text-blue-700' };
    if (submission.status === 'submitted') return { status: 'submitted', label: 'Submitted', color: 'bg-amber-100 text-amber-700' };
    if (submission.status === 'graded') return { status: 'graded', label: 'Graded', color: 'bg-green-100 text-green-700' };
    if (submission.status === 'needs_revision') return { status: 'needs_revision', label: 'Needs Revision', color: 'bg-red-100 text-red-700' };
    return { status: 'not_started', label: 'Not Started', color: 'bg-slate-100 text-slate-600' };
  };

  const getAssignmentState = (weekNumber) => {
    if (!cohort?.start_date) return { isLocked: false, unlockDate: null, dueDate: null };
    const { unlockDate, dueDate } = getAssignmentDates(cohort.start_date, weekNumber);
    const now = new Date();
    return {
      isLocked: now < unlockDate,
      isOverdue: now > dueDate,
      unlockDate,
      dueDate,
    };
  };

  const publishedAssignments = assignments.filter(a => a.status === 'published');

  const categorised = publishedAssignments.reduce((acc, assignment) => {
    const submissionStatus = getSubmissionStatus(assignment.id);
    const { isLocked } = getAssignmentState(assignment.week_number);

    if (submissionStatus.status === 'graded') {
      acc.completed.push(assignment);
    } else if (['submitted', 'in_review', 'needs_revision'].includes(submissionStatus.status)) {
      acc.needsReview.push(assignment);
    } else {
      acc.upcoming.push(assignment);
    }
    return acc;
  }, { needsReview: [], upcoming: [], completed: [] });

  const renderAssignmentCard = (assignment, index) => {
    const submissionStatus = getSubmissionStatus(assignment.id);
    const { isLocked, isOverdue, unlockDate, dueDate } = getAssignmentState(assignment.week_number);

    if (isLocked) {
      return (
        <div className="block bg-white rounded-2xl p-6 border border-slate-200 shadow-sm opacity-70 cursor-not-allowed relative">
          <div className="absolute top-4 right-4">
            <Lock className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Week {assignment.week_number}</Badge>
              <Badge className="bg-slate-200 text-slate-600">Locked</Badge>
            </div>
            <h3 className="text-lg font-bold text-slate-500 mb-1">{assignment.title}</h3>
            <p className="text-sm text-slate-400 line-clamp-2">{assignment.short_description}</p>
            {unlockDate && <AssignmentCountdown unlockDate={unlockDate} />}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mt-4 pt-4 border-t border-slate-100">
            <FileText className="w-4 h-4" />
            <span>{assignment.points} points</span>
          </div>
        </div>
      );
    }

    const isCompleted = submissionStatus.status === 'graded';

    return (
      <Link
        to={createPageUrl(`StudentAssignmentDetail?id=${assignment.id}`)}
        className={`block bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all group ${isCompleted ? 'border-green-200' : 'border-slate-200'}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline">Week {assignment.week_number}</Badge>
              <Badge className={submissionStatus.color}>{submissionStatus.label}</Badge>
              {isOverdue && submissionStatus.status === 'not_started' && (
                <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Overdue
                </Badge>
              )}
            </div>
            <h3 className={`text-lg font-bold mb-1 ${isCompleted ? 'text-slate-700' : 'text-slate-900'}`}>{assignment.title}</h3>
            {(() => {
              const raw = assignment.content_html
                ? assignment.content_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                : assignment.short_description || '';
              const preview = raw.length > 150 ? raw.slice(0, 150).trimEnd() + '…' : raw;
              return preview ? <p className="text-sm text-slate-500 mt-1">{preview}</p> : null;
            })()}
            {dueDate && !isCompleted && submissionStatus.status === 'not_started' && (
              <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                {isOverdue ? 'Was due' : 'Due'}: {dueDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at 10:00pm
                {isOverdue && ' — late submission (-15 pts)'}
              </p>
            )}
          </div>
          {isCompleted
            ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-4" />
            : <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
          }
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mt-4 pt-4 border-t border-slate-100">
          <FileText className="w-4 h-4" />
          {(() => {
            const userSubmission = submissions.find(s => s.assignment_template_id === assignment.id);
            if (userSubmission && userSubmission.status === 'graded') {
              const grade = grades.find(g => g.submission_id === userSubmission.id);
              if (grade?.rubric_grade) {
                return <span className="font-medium text-green-600">Grade: {grade.rubric_grade}</span>;
              }
              if (grade?.score !== undefined) {
                return <span>Score: {grade.score}/{assignment.points}</span>;
              }
            }
            return <span>{assignment.points} points</span>;
          })()}
        </div>
      </Link>
    );
  };

  const Section = ({ title, items, icon, emptyMsg, headerClass }) => (
    <div className="mb-10">
      <div className={`flex items-center gap-2 mb-4 ${headerClass}`}>
        {icon}
        <h2 className="text-xl font-bold">{title}</h2>
        <span className="text-sm font-medium opacity-60">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="text-slate-400 text-sm">{emptyMsg}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((assignment, index) => (
            <motion.div key={assignment.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              {renderAssignmentCard(assignment, index)}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Assignments</h1>
        <p className="text-slate-500 mt-1">Each week's assignment unlocks Saturday at 12:00pm and is due the following Friday at 10:00pm</p>
      </motion.div>

      <div className="max-w-4xl">
        <Section
          title="Needs Review"
          items={categorised.needsReview}
          icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
          emptyMsg="No assignments currently under review."
          headerClass="text-amber-700"
        />
        <Section
          title="Upcoming"
          items={categorised.upcoming}
          icon={<FileText className="w-5 h-5 text-slate-500" />}
          emptyMsg="No upcoming assignments."
          headerClass="text-slate-700"
        />
        <Section
          title="Completed"
          items={categorised.completed}
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          emptyMsg="No completed assignments yet."
          headerClass="text-green-700"
        />
      </div>
    </div>
  );
}