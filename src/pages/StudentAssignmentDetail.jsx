import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentAssignmentDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const assignmentId = urlParams.get('id');

  const [formData, setFormData] = useState({
    text_response: '',
    link_url: '',
    files: []
  });
  const [uploading, setUploading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: assignment } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      const result = await base44.entities.AssignmentTemplate.filter({ id: assignmentId });
      return result[0];
    },
    enabled: !!assignmentId,
  });

  const { data: membership } = useQuery({
    queryKey: ['my-cohort-membership'],
    queryFn: async () => {
      if (!user?.id) return null;
      const memberships = await base44.entities.CohortMembership.filter({ user_id: user.id, status: 'active' });
      return memberships[0];
    },
    enabled: !!user?.id,
  });

  const { data: submission, refetch: refetchSubmission } = useQuery({
    queryKey: ['my-submission', assignmentId],
    queryFn: async () => {
      if (!user?.id || !assignmentId) return null;
      const submissions = await base44.entities.Submission.filter({ 
        user_id: user.id, 
        assignment_template_id: assignmentId 
      });
      if (submissions.length > 0) {
        const sub = submissions[0];
        setFormData({
          text_response: sub.content || '',
          link_url: sub.link_url || '',
          files: sub.file_urls || []
        });
        return sub;
      }
      return null;
    },
    enabled: !!user?.id && !!assignmentId,
  });

  const { data: grade } = useQuery({
    queryKey: ['submission-grade', submission?.id],
    queryFn: async () => {
      if (!submission?.id) return null;
      const grades = await base44.entities.SubmissionGrade.filter({ submission_id: submission.id });
      return grades[0];
    },
    enabled: !!submission?.id,
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map(r => r.file_url);
      
      setFormData({ ...formData, files: [...formData.files, ...fileUrls] });
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const submissionData = {
        user_id: user.id,
        assignment_template_id: assignmentId,
        submission_kind: 'assignment',
        content: formData.text_response,
        link_url: formData.link_url,
        file_urls: formData.files,
        status: 'submitted',
        submitted_date: new Date().toISOString(),
        cohort_id: membership?.cohort_id
      };

      if (submission) {
        return base44.entities.Submission.update(submission.id, submissionData);
      } else {
        return base44.entities.Submission.create(submissionData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-submission'] });
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
      refetchSubmission();
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const submissionData = {
        user_id: user.id,
        assignment_template_id: assignmentId,
        submission_kind: 'assignment',
        content: formData.text_response,
        link_url: formData.link_url,
        file_urls: formData.files,
        status: 'draft',
        cohort_id: membership?.cohort_id
      };

      if (submission) {
        return base44.entities.Submission.update(submission.id, submissionData);
      } else {
        return base44.entities.Submission.create(submissionData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-submission'] });
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
      refetchSubmission();
    },
  });

  const isSubmitted = submission?.status === 'submitted' || submission?.status === 'graded';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(createPageUrl('StudentAssignments'))} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Assignments
        </Button>

        {assignment && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Badge variant="outline" className="mb-2">Week {assignment.week_number}</Badge>
                  <h1 className="text-3xl font-bold text-slate-900">{assignment.title}</h1>
                </div>
                <Badge className="bg-violet-100 text-violet-700">{assignment.points} points</Badge>
              </div>
              <p className="text-slate-600 mb-6">{assignment.description}</p>
              
              {assignment.tasks && assignment.tasks.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Tasks:</h3>
                  <ul className="space-y-2">
                    {assignment.tasks.map((task, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-600">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {grade && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Your Grade</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Score:</span>
                    <Badge className="bg-green-100 text-green-700">{grade.score}/{grade.max_score}</Badge>
                  </div>
                  {grade.feedback && (
                    <div>
                      <span className="text-slate-600 font-medium">Feedback:</span>
                      <p className="text-slate-800 mt-2 bg-slate-50 p-4 rounded-lg">{grade.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Your Submission</h2>
              
              <div className="space-y-6">
                <div>
                  <Label>Written Response (optional)</Label>
                  <Textarea
                    value={formData.text_response}
                    onChange={(e) => setFormData({ ...formData, text_response: e.target.value })}
                    placeholder="Describe your work, insights, or approach..."
                    rows={6}
                    disabled={isSubmitted}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Link URL (optional)</Label>
                  <Input
                    type="url"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://..."
                    disabled={isSubmitted}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Files (optional)</Label>
                  <div className="mt-2">
                    {!isSubmitted && (
                      <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-violet-500 hover:bg-violet-50 transition-all cursor-pointer">
                        <Upload className="w-5 h-5 text-slate-500" />
                        <span className="text-sm text-slate-600">Upload files</span>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    )}
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </div>
                    )}
                    {formData.files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {formData.files.map((url, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                              File {idx + 1}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {!isSubmitted && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => saveDraftMutation.mutate()}
                      variant="outline"
                      disabled={saveDraftMutation.isPending}
                    >
                      {saveDraftMutation.isPending ? 'Saving...' : 'Save Draft'}
                    </Button>
                    <Button
                      onClick={() => submitMutation.mutate()}
                      className="bg-violet-600 hover:bg-violet-700"
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending ? 'Submitting...' : 'Submit Assignment'}
                    </Button>
                  </div>
                )}

                {isSubmitted && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800 font-medium">Assignment submitted successfully!</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}