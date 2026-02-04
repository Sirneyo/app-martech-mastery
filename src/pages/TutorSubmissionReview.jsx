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
import { ArrowLeft, User, Calendar, FileText, Link as LinkIcon, Download } from 'lucide-react';
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

  const { data: student } = useQuery({
    queryKey: ['student', submission?.user_id],
    queryFn: async () => {
      const result = await base44.entities.User.filter({ id: submission.user_id });
      return result[0];
    },
    enabled: !!submission?.user_id,
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
      const gradeData = {
        submission_id: submissionId,
        graded_by: user.id,
        rubric_grade: rubricGrade,
        feedback_text: feedbackText,
        feedback_url: feedbackUrl,
        graded_date: new Date().toISOString(),
      };

      await base44.entities.SubmissionGrade.create(gradeData);

      const newStatus = (rubricGrade === 'Poor' || rubricGrade === 'Fair') ? 'needs_revision' : 'graded';
      await base44.entities.Submission.update(submissionId, { status: newStatus });

      if (newStatus === 'graded') {
        const isProject = submission.submission_kind === 'project';
        const points = rubricGrade === 'Excellent' 
          ? (isProject ? 60 : 30) 
          : (isProject ? 40 : 20);
        
        const reason = isProject 
          ? (rubricGrade === 'Excellent' ? 'graded_excellent_project' : 'graded_good_project')
          : (rubricGrade === 'Excellent' ? 'graded_excellent_assignment' : 'graded_good_assignment');

        await base44.entities.PointsLedger.create({
          user_id: submission.user_id,
          points: points,
          reason: reason,
          source_type: submission.submission_kind,
          source_id: submissionId,
          awarded_by: user.id
        });

        // Unlock next assignment if this was an assignment submission
        if (submission.submission_kind === 'assignment' && submission.assignment_template_id) {
          const allTemplates = await base44.entities.AssignmentTemplate.list('week_number');
          const currentTemplate = allTemplates.find(t => t.id === submission.assignment_template_id);
          
          if (currentTemplate) {
            const currentIndex = allTemplates.findIndex(t => t.id === currentTemplate.id);
            const nextTemplate = allTemplates[currentIndex + 1];
            
            // Next assignment is automatically unlocked when student views the assignments page
            // No additional action needed here - the StudentAssignments page checks previous submission status
          }
        }
      }
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

  const handleSubmitGrade = () => {
    if (!rubricGrade || !feedbackText) {
      alert('Please select a grade and provide feedback');
      return;
    }
    gradeMutation.mutate();
  };

  const backUrl = submission?.submission_kind === 'assignment' 
    ? 'TutorAssignmentSubmissions' 
    : 'TutorProjectSubmissions';

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
                  <span className="text-sm">{student?.full_name}</span>
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
                    <Label>Feedback Video URL (Optional)</Label>
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