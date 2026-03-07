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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Upload, Loader2, CheckCircle, Download, FileText, Calendar, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactQuill from 'react-quill';
import AssignmentAudioPlayer from '@/components/AssignmentAudioPlayer';

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
  const quillRef = React.useRef(null);

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

  const { data: grades = [] } = useQuery({
    queryKey: ['submission-grades', submission?.id],
    queryFn: async () => {
      if (!submission?.id) return [];
      const allGrades = await base44.entities.SubmissionGrade.filter({ submission_id: submission.id });
      return allGrades.sort((a, b) => new Date(b.graded_date) - new Date(a.graded_date));
    },
    enabled: !!submission?.id,
  });

  const { data: downloads = [] } = useQuery({
    queryKey: ['template-downloads', assignmentId],
    queryFn: () => base44.entities.TemplateDownload.filter({ 
      template_type: 'assignment',
      template_id: assignmentId 
    }),
    enabled: !!assignmentId,
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

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        try {
          const result = await base44.integrations.Core.UploadFile({ file });
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', result.file_url);
          }
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }
    };
  };

  const handleVideoUpload = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'video/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        try {
          const result = await base44.integrations.Core.UploadFile({ file });
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'video', result.file_url);
          }
        } catch (error) {
          console.error('Error uploading video:', error);
        }
      }
    };
  };

  const quillModules = React.useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: handleImageUpload,
        video: handleVideoUpload
      }
    }
  }), []);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const isResubmission = submission && needsRevision;
      const submissionData = {
        user_id: user.id,
        assignment_template_id: assignmentId,
        submission_kind: 'assignment',
        content: formData.text_response,
        link_url: formData.link_url,
        file_urls: formData.files,
        status: 'submitted',
        submitted_date: new Date().toISOString(),
        cohort_id: membership?.cohort_id,
        attempt_number: isResubmission ? (submission.attempt_number || 1) + 1 : 1,
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
      queryClient.invalidateQueries({ queryKey: ['assignment-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
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

  const [briefOpen, setBriefOpen] = React.useState(false);

  const isSubmitted = submission?.status === 'submitted' || submission?.status === 'in_review' || submission?.status === 'graded';
  const needsRevision = submission?.status === 'needs_revision';
  const isReadOnly = isSubmitted && !needsRevision;

  let evidenceReqs = { allow_file: true, allow_link: true, allow_text: true };
  try {
    if (assignment?.evidence_requirements_json) {
      evidenceReqs = JSON.parse(assignment.evidence_requirements_json);
    }
  } catch (e) {
    // fallback to defaults
  }

  const latestGrade = grades[0];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(createPageUrl('StudentAssignments'))} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Assignments
        </Button>

        {assignment && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="col-span-2 space-y-6">

                {/* Assignment Brief Card — styled like the template preview */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {assignment.thumbnail_url && (
                    <img src={assignment.thumbnail_url} alt={assignment.title} className="w-full h-56 object-cover" />
                  )}
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline">Week {assignment.week_number}</Badge>
                          <Badge className={
                            submission?.status === 'graded' ? 'bg-green-100 text-green-700' :
                            submission?.status === 'needs_revision' ? 'bg-amber-100 text-amber-700' :
                            submission?.status === 'submitted' || submission?.status === 'in_review' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }>
                            {submission?.status ? submission.status.replace('_', ' ') : 'Not Started'}
                          </Badge>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">{assignment.title}</h1>
                        {assignment.short_description && (
                          <p className="text-lg text-slate-600">{assignment.short_description}</p>
                        )}
                      </div>
                      <div className="text-right ml-6 flex-shrink-0">
                        <p className="text-sm text-slate-500">Points</p>
                        <p className="text-2xl font-bold text-violet-600">{assignment.points} pts</p>
                      </div>
                    </div>

                    {/* Full brief — collapsible */}
                    {(assignment.content_html || (assignment.tasks && assignment.tasks.length > 0)) && (
                      <>
                        {/* Preview snippet */}
                        {!briefOpen && assignment.content_html && (() => {
                          const text = assignment.content_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                          const preview = text.length > 150 ? text.slice(0, 150) : null;
                          return preview ? (
                            <p className="mt-4 text-slate-600 text-sm leading-relaxed">
                              {preview}…
                            </p>
                          ) : null;
                        })()}
                        <Collapsible open={briefOpen} onOpenChange={setBriefOpen}>
                          <CollapsibleContent>
                            <div className="mt-6 pt-6 border-t border-slate-100">
                              {assignment.content_html && (
                               <div
                                 className="rich-content mb-6"
                                 dangerouslySetInnerHTML={{ __html: assignment.content_html }}
                               />
                              )}
                              {assignment.audio_files && assignment.audio_files.length > 0 && (
                               <AssignmentAudioPlayer audioFiles={assignment.audio_files} />
                              )}
                              {assignment.tasks && assignment.tasks.length > 0 && !assignment.content_html && (
                                <ul className="space-y-2 mb-6">
                                  {assignment.tasks.map((task, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-slate-600">
                                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                      <span>{task}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {downloads.length > 0 && (
                                <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
                                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <Download className="w-5 h-5" />
                                    Downloads
                                  </h3>
                                  <div className="space-y-2">
                                    {downloads.map((download) => (
                                      <a
                                        key={download.id}
                                        href={download.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-slate-100 transition-colors border border-slate-100"
                                      >
                                        <FileText className="w-5 h-5 text-violet-600" />
                                        <span className="flex-1 font-medium text-slate-700">{download.file_name}</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm" className="mt-4">
                              {briefOpen ? (
                                <><ChevronUp className="w-4 h-4 mr-1" /> Hide Full Brief</>
                              ) : (
                                <><ChevronDown className="w-4 h-4 mr-1" /> View Full Brief</>
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </Collapsible>
                      </>
                    )}
                  </div>
                </div>

                {/* Student Submission */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-bold text-slate-900">Your Submission</h2>
                  </div>
                  <div className="p-6">
                    {needsRevision && (
                      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-900">
                            {latestGrade?.rubric_grade === 'Fair' ? 'Fair Grade — Resubmission Required' : 'Revision Required'}
                          </p>
                          <p className="text-sm text-amber-800 mt-1">
                            {latestGrade?.rubric_grade === 'Fair'
                              ? 'Your assignment was graded Fair. Please review the feedback below, improve your work, and resubmit. Note: no additional points will be awarded for resubmissions.'
                              : 'Your assignment was graded Poor. Please review the feedback below, improve your work, and resubmit. Note: no additional points will be awarded for resubmissions.'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      {evidenceReqs.allow_text && (
                        <div>
                          <Label>Written Response</Label>
                          <div className="mt-2">
                            <ReactQuill
                              ref={quillRef}
                              value={formData.text_response}
                              onChange={(value) => setFormData({ ...formData, text_response: value })}
                              placeholder="Describe your work, insights, or approach..."
                              readOnly={isReadOnly}
                              theme="snow"
                              modules={quillModules}
                              style={{ height: '400px', marginBottom: '50px' }}
                              className="bg-white rounded-md"
                            />
                          </div>
                        </div>
                      )}

                      {evidenceReqs.allow_link && (
                        <div>
                          <Label>Assignment Link URL <span className="text-red-500">*</span></Label>
                          <Input
                            type="url"
                            value={formData.link_url}
                            onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                            placeholder="https://..."
                            disabled={isReadOnly}
                            className="mt-2"
                          />
                        </div>
                      )}

                      {evidenceReqs.allow_file && (
                        <div>
                          <Label>Files</Label>
                          <div className="mt-2">
                            {!isReadOnly && (
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
                                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate flex-1">
                                      File {idx + 1}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {!isReadOnly && (
                        <div className="flex gap-3 pt-4 border-t border-slate-200">
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
                           disabled={submitMutation.isPending || (evidenceReqs.allow_link && !formData.link_url.trim())}
                          >
                            {submitMutation.isPending ? 'Submitting...' : needsRevision ? 'Resubmit' : 'Submit Assignment'}
                          </Button>
                        </div>
                      )}

                      {isReadOnly && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-800 font-medium">Assignment submitted successfully!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Feedback & History */}
                {grades.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                      <h2 className="text-lg font-bold text-slate-900">Feedback & History</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      {grades.map((grade, idx) => (
                        <div key={grade.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {grade.rubric_grade && (
                                <Badge className={
                                  grade.rubric_grade === 'Excellent' ? 'bg-green-100 text-green-700' :
                                  grade.rubric_grade === 'Good' ? 'bg-blue-100 text-blue-700' :
                                  grade.rubric_grade === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }>
                                  {grade.rubric_grade}
                                </Badge>
                              )}
                              {grade.score !== undefined && grade.max_score !== undefined && (
                                <Badge variant="outline">{grade.score}/{grade.max_score}</Badge>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(grade.graded_date).toLocaleDateString('en-GB', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {grade.feedback_text && (
                            <p className="text-slate-700 text-sm whitespace-pre-wrap mb-3">{grade.feedback_text}</p>
                          )}
                          {grade.feedback_url && (
                            <a
                              href={grade.feedback_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 text-sm font-medium hover:underline"
                            >
                              <FileText className="w-4 h-4" />
                              Watch Video Feedback
                            </a>
                          )}
                          {idx === 0 && grades.length > 1 && (
                            <p className="text-xs text-slate-500 mt-2 italic">Latest feedback</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sticky top-6">
                  <h3 className="font-bold text-slate-900 mb-4">Details</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Status</p>
                      <Badge variant={
                        submission?.status === 'graded' ? 'default' :
                        submission?.status === 'submitted' || submission?.status === 'in_review' ? 'secondary' :
                        submission?.status === 'needs_revision' ? 'destructive' :
                        'outline'
                      }>
                        {submission?.status || 'Not Started'}
                      </Badge>
                    </div>

                    {submission && (
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Attempt</p>
                        <p className="font-medium text-slate-900">#{submission.attempt_number || 1}</p>
                      </div>
                    )}

                    {latestGrade && latestGrade.score !== undefined && (
                      <div className="pt-4 border-t border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Score</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {latestGrade.score}/{latestGrade.max_score}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}