import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, FileText, Link as LinkIcon, Download } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminSubmissionDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const submissionId = urlParams.get('id');

  const { data: submission } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: async () => {
      const subs = await base44.entities.Submission.filter({ id: submissionId });
      return subs[0];
    },
    enabled: !!submissionId,
  });

  const { data: student } = useQuery({
    queryKey: ['student', submission?.user_id],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: submission.user_id });
      return users[0];
    },
    enabled: !!submission?.user_id,
  });

  const { data: cohort } = useQuery({
    queryKey: ['cohort', submission?.cohort_id],
    queryFn: async () => {
      const cohorts = await base44.entities.Cohort.filter({ id: submission.cohort_id });
      return cohorts[0];
    },
    enabled: !!submission?.cohort_id,
  });

  const { data: template } = useQuery({
    queryKey: ['template', submission?.assignment_template_id || submission?.project_template_id],
    queryFn: async () => {
      if (submission.submission_kind === 'assignment') {
        const templates = await base44.entities.AssignmentTemplate.filter({ id: submission.assignment_template_id });
        return templates[0];
      } else {
        const templates = await base44.entities.ProjectTemplate.filter({ id: submission.project_template_id });
        return templates[0];
      }
    },
    enabled: !!(submission?.assignment_template_id || submission?.project_template_id),
  });

  const { data: grade } = useQuery({
    queryKey: ['grade', submissionId],
    queryFn: async () => {
      const grades = await base44.entities.SubmissionGrade.filter({ submission_id: submissionId });
      return grades[0] || null;
    },
    enabled: !!submissionId,
  });

  if (!submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-slate-500">Loading submission...</p>
        </div>
      </div>
    );
  }

  const ageHours = submission.submitted_date 
    ? Math.floor((new Date() - new Date(submission.submitted_date)) / (1000 * 60 * 60))
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('AdminSubmissions'))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Submissions
          </Button>
        </div>

        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2">Submission Details</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">{submission.submission_kind}</Badge>
                  <Badge className={
                    submission.status === 'graded' ? 'bg-green-100 text-green-700' :
                    submission.status === 'needs_revision' ? 'bg-red-100 text-red-700' :
                    ['submitted', 'in_review'].includes(submission.status) ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-700'
                  }>
                    {submission.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Student</p>
                <p className="font-semibold text-slate-900">{student?.full_name || 'Loading...'}</p>
                <p className="text-sm text-slate-600">{student?.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Cohort</p>
                <p className="font-semibold text-slate-900">{cohort?.name || 'No cohort'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Template</p>
                <p className="font-semibold text-slate-900">{template?.title || 'No template'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Attempt</p>
                <p className="font-semibold text-slate-900">#{submission.attempt_number || 1}</p>
              </div>
              {submission.submitted_date && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Submitted</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(submission.submitted_date).toLocaleString()}
                  </p>
                  {ageHours !== null && (
                    <p className="text-sm text-slate-600">{ageHours} hours ago</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submitted Content */}
        <Card>
          <CardHeader>
            <CardTitle>Submitted Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submission.content && (
              <div>
                <p className="text-sm text-slate-500 mb-2">Text Content</p>
                <p className="text-slate-900 whitespace-pre-wrap">{submission.content}</p>
              </div>
            )}

            {submission.link_url && (
              <div>
                <p className="text-sm text-slate-500 mb-2">Submitted Link</p>
                <a 
                  href={submission.link_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 underline"
                >
                  <LinkIcon className="w-4 h-4" />
                  {submission.link_url}
                </a>
              </div>
            )}

            {submission.file_urls && submission.file_urls.length > 0 && (
              <div>
                <p className="text-sm text-slate-500 mb-2">Submitted Files</p>
                <div className="space-y-2">
                  {submission.file_urls.map((url, idx) => (
                    <a 
                      key={idx}
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 underline"
                    >
                      <Download className="w-4 h-4" />
                      File {idx + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {!submission.content && !submission.link_url && (!submission.file_urls || submission.file_urls.length === 0) && (
              <p className="text-slate-500 text-center py-8">No content submitted yet</p>
            )}
          </CardContent>
        </Card>

        {/* Grade (if exists) */}
        {grade && (
          <Card>
            <CardHeader>
              <CardTitle>Grading</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {grade.rubric_grade && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Rubric Grade</p>
                    <Badge className="text-lg px-3 py-1">{grade.rubric_grade}</Badge>
                  </div>
                )}
                {grade.score !== undefined && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Score</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {grade.score}/{grade.max_score}
                    </p>
                  </div>
                )}
              </div>
              {grade.feedback_text && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Feedback</p>
                  <p className="text-slate-900 whitespace-pre-wrap">{grade.feedback_text}</p>
                </div>
              )}
              {grade.feedback_url && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Video Feedback</p>
                  <a 
                    href={grade.feedback_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    View Video Feedback
                  </a>
                </div>
              )}
              {grade.graded_date && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Graded On</p>
                  <p className="text-slate-900">{new Date(grade.graded_date).toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}