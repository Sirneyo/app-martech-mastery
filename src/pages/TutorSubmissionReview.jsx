import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Calendar, Link as LinkIcon, Download, History, ChevronDown, ChevronUp, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function TutorSubmissionReview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const submissionId = urlParams.get('id');

  const [rubricGrade, setRubricGrade] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackUrl, setFeedbackUrl] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: submission } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: async () => {
      const result = await base44.entities.Submission.filter({ id: submissionId });
      return result[0];
    },
    enabled: !!submissionId,
  });

  const { data: student, isPending: isStudentPending } = useQuery({
    queryKey: ['student', submission?.user_id],
    queryFn: async () => {
      const response = await base44.functions.invoke('getStudentInfo', { userId: submission.user_id });
      return response.data.student;
    },
    enabled: !!submission?.user_id,
  });

  // Fetch past submissions for the same student + assignment (history)
  const { data: submissionHistory = [] } = useQuery({
    queryKey: ['submission-history', submission?.user_id, submission?.assignment_template_id, submission?.project_template_id],
    queryFn: async () => {
      const allSubs = await base44.entities.Submission.filter({
        user_id: submission.user_id,
        submission_kind: submission.submission_kind,
      });
      const templateId = submission.assignment_template_id || submission.project_template_id;
      const related = allSubs
        .filter(s => {
          const sId = s.assignment_template_id || s.project_template_id;
          return sId === templateId && s.id !== submissionId && s.status !== 'draft';
        })
        .sort((a, b) => new Date(b.submitted_date) - new Date(a.submitted_date));

      // Fetch grades for each past submission
      const withGrades = await Promise.all(related.map(async (s) => {
        const grades = await base44.entities.SubmissionGrade.filter({ submission_id: s.id });
        return { ...s, grade: grades[grades.length - 1] || null };
      }));
      return withGrades;
    },
    enabled: !!(submission?.user_id && (submission?.assignment_template_id || submission?.project_template_id)),
  });

  const { data: template } = useQuery({
    queryKey: ['template', submission?.assignment_template_id || submission?.project_template_id],
    queryFn: async () => {
      if (submission.submission_kind === 'assignment') {
        const result = await base44.entities.AssignmentTemplate.filter({ id: submission.assignment_template_id });
        return result[0];
      } else {
        const result = await base44.entities.ProjectTemplate.filter({ id: submission.project_template_id });
        return result[0];
      }
    },
    enabled: !!(submission?.assignment_template_id || submission?.project_template_id),
  });

  const gradeMutation = useMutation({
    mutationFn: async () => {
      // Calculate score based on rubric grade
      const isProject = submission.submission_kind === 'project';
      let score = 0;
      let maxScore = 100;
      
      if (isProject) {
        // Project scoring (keep existing logic)
        if (rubricGrade === 'Excellent') score = 60;
        else if (rubricGrade === 'Good') score = 40;
        maxScore = 100;
      } else {
        // Assignment scoring
        if (rubricGrade === 'Excellent') score = 100;
        else if (rubricGrade === 'Good') score = 50;
        else if (rubricGrade === 'Fair') score = 25;
        else score = 0; // Poor
        maxScore = 100;
      }
      
      const gradeData = {
        submission_id: submissionId,
        graded_by: user.id,
        rubric_grade: rubricGrade,
        feedback_text: feedbackText,
        feedback_url: feedbackUrl,
        graded_date: new Date().toISOString(),
        score: score,
        max_score: maxScore,
      };

      await base44.entities.SubmissionGrade.create(gradeData);

      const newStatus = (rubricGrade === 'Poor' || rubricGrade === 'Fair') ? 'needs_revision' : 'graded';
      await base44.entities.Submission.update(submissionId, { status: newStatus });

      // Points are awarded automatically by the processGradePoints entity automation
      // when the SubmissionGrade record is created above — no manual award needed here.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submission'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['project-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-assignment-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['grade'] });
      
      const backUrl = submission.submission_kind === 'assignment' 
        ? 'TutorAssignmentSubmissions' 
        : 'TutorProjectSubmissions';
      navigate(createPageUrl(backUrl));
    },
  });

  const isValidUrl = (val) => {
    try { new URL(val); return true; } catch { return false; }
  };

  const handleSubmitGrade = () => {
    if (!rubricGrade) {
      alert('Please select a grade');
      return;
    }
    if (!feedbackUrl.trim()) {
      alert('Please provide a Feedback Video URL');
      return;
    }
    if (!isValidUrl(feedbackUrl.trim())) {
      alert('Please enter a valid URL for the Feedback Video URL');
      return;
    }
    gradeMutation.mutate();
  };

  const backUrl = submission?.submission_kind === 'assignment' 
    ? 'TutorAssignmentSubmissions' 
    : 'TutorProjectSubmissions';

  const getStudentDisplayName = () => {
    if (isStudentPending) return 'Loading student...';
    if (!student) return 'Unknown Student';
    return student.data?.display_name || student.full_name || student.email || 'Unknown Student';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(createPageUrl(backUrl))} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Submissions
        </Button>

        {submission && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{template?.title}</h1>
                  <Badge className="mt-2 bg-violet-100 text-violet-700">{submission.submission_kind}</Badge>
                </div>
                <Badge className={
                  submission.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                  submission.status === 'graded' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }>
                  {submission.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-4 h-4" />
                  <span className="text-sm">{getStudentDisplayName()}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {submission.submitted_date && format(new Date(submission.submitted_date), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {submission.content && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Student Response:</h3>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-slate-700 whitespace-pre-wrap">{submission.content}</p>
                    </div>
                  </div>
                )}

                {submission.link_url && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Submitted Link:</h3>
                    <a
                      href={submission.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <LinkIcon className="w-4 h-4" />
                      {submission.link_url}
                    </a>
                  </div>
                )}

                {submission.file_urls && submission.file_urls.length > 0 && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Submitted Files:</h3>
                    <div className="space-y-2">
                      {submission.file_urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:underline p-3 bg-slate-50 rounded-lg"
                        >
                          <Download className="w-4 h-4" />
                          File {idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {submissionHistory.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                      <History className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">Submission History</p>
                      <p className="text-sm text-slate-500">{submissionHistory.length} previous attempt{submissionHistory.length !== 1 ? 's' : ''} for this assignment</p>
                    </div>
                  </div>
                  {showHistory ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {showHistory && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {submissionHistory.map((past) => (
                      <div key={past.id} className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className={
                              past.status === 'graded' ? 'bg-green-100 text-green-700' :
                              past.status === 'needs_revision' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }>
                              {past.status}
                            </Badge>
                            {past.grade && (
                              <Badge className={
                                past.grade.rubric_grade === 'Excellent' ? 'bg-violet-100 text-violet-700' :
                                past.grade.rubric_grade === 'Good' ? 'bg-blue-100 text-blue-700' :
                                past.grade.rubric_grade === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }>
                                {past.grade.rubric_grade}
                              </Badge>
                            )}
                            <span className="text-xs text-slate-400">Attempt #{past.attempt_number || '?'}</span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {past.submitted_date && format(new Date(past.submitted_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {past.grade?.feedback_text && (
                          <div className="bg-slate-50 rounded-lg p-3 mb-2">
                            <p className="text-xs font-semibold text-slate-500 mb-1">Tutor Feedback</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{past.grade.feedback_text}</p>
                          </div>
                        )}
                        {past.grade?.feedback_url && (
                          <a
                            href={past.grade.feedback_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:underline mt-1"
                          >
                            <Video className="w-3 h-3" />
                            View feedback video
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {submission.status !== 'graded' && (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Grade Submission</h2>

                <div className="space-y-6">
                  <div>
                    <Label>Rubric Grade</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {['Poor', 'Fair', 'Good', 'Excellent'].map((grade) => (
                        <button
                          key={grade}
                          onClick={() => setRubricGrade(grade)}
                          className={`px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                            rubricGrade === grade
                              ? 'border-violet-600 bg-violet-50 text-violet-900'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {grade}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Feedback</Label>
                    <Textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Provide constructive feedback for the student..."
                      rows={6}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Feedback Video URL <span className="text-red-500">*</span></Label>
                    <Input
                      type="url"
                      value={feedbackUrl}
                      onChange={(e) => setFeedbackUrl(e.target.value)}
                      placeholder="https://www.loom.com/share/..."
                      className="mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-1">Add a link to your Loom video review</p>
                  </div>

                  <Button
                    onClick={handleSubmitGrade}
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    disabled={gradeMutation.isPending}
                  >
                    {gradeMutation.isPending ? 'Submitting Grade...' : 'Submit Grade'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}