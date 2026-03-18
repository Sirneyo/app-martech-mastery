import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle, Clock, Lock, ChevronDown, ChevronRight, Play, FileText, Link, Send, MessageSquare, RotateCcw, Upload } from 'lucide-react';

const STATUS_STYLES = {
  not_started: { badge: 'bg-slate-100 text-slate-500', label: 'Not Started' },
  in_progress: { badge: 'bg-blue-100 text-blue-700', label: 'In Progress' },
  in_review: { badge: 'bg-amber-100 text-amber-700', label: 'In Review' },
  approved: { badge: 'bg-green-100 text-green-700', label: 'Approved' },
  rejected: { badge: 'bg-red-100 text-red-700', label: 'Needs Revision' },
};

const PRIORITY_DOT = { high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-slate-300' };

function OnboardingGate({ project, enrollment, onComplete }) {
  const [videoWatched, setVideoWatched] = useState(enrollment.onboarding_video_watched || false);
  const [agreed, setAgreed] = useState(enrollment.onboarding_agreement_signed || false);
  const [signName, setSignName] = useState('');
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: (data) => base44.entities.SimProjectEnrollment.update(enrollment.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sim-enrollment', enrollment.id] });
      onComplete();
    },
  });

  const canProceed = videoWatched && agreed && signName.trim().length > 2;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
          <Play className="w-8 h-8 text-violet-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Welcome to {project.company_name || project.title}</h2>
        <p className="text-slate-500 mt-2">Before you begin, please complete the following onboarding steps.</p>
      </div>

      {/* Step 1: Watch Video */}
      <div className={`bg-white rounded-2xl border-2 p-5 transition-colors ${videoWatched ? 'border-green-300' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${videoWatched ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
            {videoWatched ? <CheckCircle className="w-4 h-4" /> : '1'}
          </div>
          <h3 className="font-semibold text-slate-900">Watch the Project Briefing</h3>
        </div>
        {project.intro_video_url ? (
          <div className="bg-slate-100 rounded-xl overflow-hidden mb-3">
            <iframe
              src={project.intro_video_url}
              className="w-full aspect-video"
              allowFullScreen
              title="Project Briefing"
            />
          </div>
        ) : (
          <div className="bg-slate-100 rounded-xl p-8 text-center text-slate-400 mb-3">
            <Play className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No intro video set for this project</p>
          </div>
        )}
        {!videoWatched && (
          <Button onClick={() => setVideoWatched(true)} variant="outline" size="sm">
            Mark video as watched
          </Button>
        )}
      </div>

      {/* Step 2: Sign Agreement */}
      <div className={`bg-white rounded-2xl border-2 p-5 transition-colors ${agreed ? 'border-green-300' : videoWatched ? 'border-slate-200' : 'border-slate-100 opacity-50 pointer-events-none'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${agreed ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
            {agreed ? <CheckCircle className="w-4 h-4" /> : '2'}
          </div>
          <h3 className="font-semibold text-slate-900">Sign the Participation Agreement</h3>
        </div>
        {project.agreement_text ? (
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 mb-4 max-h-48 overflow-y-auto border border-slate-200 whitespace-pre-wrap">
            {project.agreement_text}
          </div>
        ) : (
          <p className="text-sm text-slate-500 mb-4">By proceeding, you agree to treat all project materials as confidential and to act professionally as you would in a real work environment.</p>
        )}
        {!agreed && (
          <div className="space-y-2">
            <Label className="text-sm">Type your full name to sign *</Label>
            <Input value={signName} onChange={e => setSignName(e.target.value)} placeholder="Your full name..." className="max-w-xs" />
          </div>
        )}
        {agreed && <p className="text-sm text-green-600 font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Signed by {enrollment.agreement_signed_name}</p>}
        {!agreed && (
          <Button
            onClick={() => setAgreed(true)}
            disabled={signName.trim().length < 3}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            I agree & sign
          </Button>
        )}
      </div>

      <Button
        onClick={() => completeMutation.mutate({
          onboarding_video_watched: true,
          onboarding_agreement_signed: true,
          agreement_signed_name: signName || enrollment.agreement_signed_name,
          agreement_signed_date: new Date().toISOString(),
          status: 'active',
        })}
        disabled={!canProceed || completeMutation.isPending}
        className="w-full"
        size="lg"
      >
        {completeMutation.isPending ? 'Starting...' : 'Enter Workspace →'}
      </Button>
    </div>
  );
}

function TaskCard({ task, submission, enrollment, isLocked, phases, onSubmissionUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [submittingLink, setSubmittingLink] = useState('');
  const [submittingText, setSubmittingText] = useState('');
  const [handoverComment, setHandoverComment] = useState('');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  const { data: taskComments = [] } = useQuery({
    queryKey: ['task-comments', submission?.id],
    queryFn: () => submission?.id
      ? base44.entities.SimTaskComment.filter({ task_submission_id: submission.id })
      : Promise.resolve([]),
    enabled: !!submission?.id && expanded,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      if (submission?.id) {
        return base44.entities.SimTaskSubmission.update(submission.id, {
          status: 'in_progress',
          first_opened_date: submission.first_opened_date || new Date().toISOString(),
        });
      }
      return base44.entities.SimTaskSubmission.create({
        project_id: task.project_id,
        task_id: task.id,
        enrollment_id: enrollment.id,
        student_user_id: enrollment.student_user_id,
        status: 'in_progress',
        first_opened_date: new Date().toISOString(),
      });
    },
    onSuccess: () => onSubmissionUpdate(),
  });

  const submitMutation = useMutation({
    mutationFn: (data) => base44.entities.SimTaskSubmission.update(submission.id, {
      ...data,
      status: 'in_review',
      submitted_date: new Date().toISOString(),
      revision_count: (submission.revision_count || 0),
    }),
    onSuccess: () => onSubmissionUpdate(),
  });

  const addCommentMutation = useMutation({
    mutationFn: (content) => base44.entities.SimTaskComment.create({
      task_submission_id: submission.id,
      project_id: task.project_id,
      task_id: task.id,
      author_user_id: enrollment.student_user_id,
      author_role: 'student',
      content,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', submission?.id] });
      setNewComment('');
    },
  });

  const subtasks = (() => { try { return JSON.parse(task.subtasks_json || '[]'); } catch { return []; } })();
  const completedSubtasks = (() => { try { return JSON.parse(submission?.subtasks_completed_json || '[]'); } catch { return []; } })();

  const toggleSubtask = (i) => {
    const updated = completedSubtasks.includes(i)
      ? completedSubtasks.filter(x => x !== i)
      : [...completedSubtasks, i];
    base44.entities.SimTaskSubmission.update(submission.id, {
      subtasks_completed_json: JSON.stringify(updated),
    }).then(() => onSubmissionUpdate());
  };

  const status = submission?.status || 'not_started';
  const statusInfo = STATUS_STYLES[status] || STATUS_STYLES.not_started;
  const isApproved = status === 'approved';
  const isInReview = status === 'in_review';

  return (
    <div className={`rounded-2xl border transition-all ${isLocked ? 'bg-slate-50 border-slate-200 opacity-60' : isApproved ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => !isLocked && setExpanded(e => !e)}
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority] || PRIORITY_DOT.medium}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-sm ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}>{task.title}</span>
            {isLocked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
          </div>
          {subtasks.length > 0 && !isLocked && (
            <p className="text-xs text-slate-400 mt-0.5">{completedSubtasks.length}/{subtasks.length} subtasks</p>
          )}
        </div>
        <Badge className={`text-xs ${statusInfo.badge}`}>{statusInfo.label}</Badge>
        {!isLocked && (expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />)}
      </div>

      {expanded && !isLocked && (
        <div className="border-t border-slate-100 p-5 space-y-4">
          {/* Brief */}
          {task.brief && (
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {task.brief}
            </div>
          )}

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Checklist</p>
              {subtasks.map((s, i) => (
                <label key={i} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-slate-50 ${isInReview || isApproved ? 'pointer-events-none' : ''}`}>
                  <input
                    type="checkbox"
                    checked={completedSubtasks.includes(i)}
                    onChange={() => toggleSubtask(i)}
                    className="w-4 h-4 rounded accent-violet-600"
                    disabled={isInReview || isApproved}
                  />
                  <span className={`text-sm ${completedSubtasks.includes(i) ? 'line-through text-slate-400' : 'text-slate-700'}`}>{s}</span>
                </label>
              ))}
            </div>
          )}

          {/* Tutor Feedback */}
          {submission?.tutor_feedback && (
            <div className={`rounded-xl p-4 ${status === 'rejected' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1 ${status === 'rejected' ? 'text-red-600' : 'text-green-600'}`">
                Tutor Feedback
              </p>
              <p className="text-sm text-slate-700">{submission.tutor_feedback}</p>
            </div>
          )}

          {/* Start button */}
          {status === 'not_started' && (
            <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} className="gap-1">
              <Play className="w-4 h-4" /> Start Task
            </Button>
          )}

          {/* Submission */}
          {(status === 'in_progress' || status === 'rejected') && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-700">Submit Your Work</p>
              {(task.deliverable_type === 'link') && (
                <div className="space-y-1">
                  <Label className="text-xs">Link URL</Label>
                  <Input value={submittingLink} onChange={e => setSubmittingLink(e.target.value)} placeholder="https://..." />
                </div>
              )}
              {(task.deliverable_type === 'text' || task.deliverable_type === 'presentation' || task.deliverable_type === 'spreadsheet') && (
                <div className="space-y-1">
                  <Label className="text-xs">Your submission</Label>
                  <Textarea value={submittingText} onChange={e => setSubmittingText(e.target.value)} rows={4} placeholder="Write your response or paste your content..." />
                </div>
              )}
              {task.deliverable_type === 'file' && (
                <div className="bg-slate-100 rounded-xl p-4 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" /> File upload (available in student view)
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Handover comment (optional)</Label>
                <Textarea value={handoverComment} onChange={e => setHandoverComment(e.target.value)} rows={2} placeholder="Anything to flag to your reviewer..." />
              </div>
              <Button
                onClick={() => submitMutation.mutate({
                  deliverable_link: submittingLink,
                  deliverable_text: submittingText,
                  student_comment: handoverComment,
                  revision_count: (submission?.revision_count || 0) + (status === 'rejected' ? 1 : 0),
                })}
                disabled={submitMutation.isPending}
                className="gap-1"
              >
                <Send className="w-4 h-4" /> Submit for Review
              </Button>
            </div>
          )}

          {status === 'in_review' && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-xl p-3 text-sm">
              <Clock className="w-4 h-4" />
              <span>Submitted for review — waiting for tutor feedback.</span>
            </div>
          )}

          {/* Comments */}
          {submission?.id && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> Comments ({taskComments.length})
              </p>
              {taskComments.map(c => (
                <div key={c.id} className={`rounded-xl p-3 text-sm ${c.author_role === 'tutor' ? 'bg-violet-50 border border-violet-100' : 'bg-slate-50 border border-slate-200'}`}>
                  <p className="font-medium text-slate-700 text-xs mb-1">{c.author_name || (c.author_role === 'tutor' ? 'Tutor' : 'You')}</p>
                  <p className="text-slate-600">{c.content}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  rows={2}
                  placeholder="Add a comment..."
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => addCommentMutation.mutate(newComment)}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                >
                  Post
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PhaseSection({ phase, tasks, submissions, enrollment }) {
  const [expanded, setExpanded] = useState(true);
  const queryClient = useQueryClient();

  const isTaskLocked = (task) => {
    if (!task.dependency_task_id) return false;
    const depSub = submissions.find(s => s.task_id === task.dependency_task_id);
    return depSub?.status !== 'approved';
  };

  const approvedCount = tasks.filter(t => submissions.find(s => s.task_id === t.id && s.status === 'approved')).length;
  const pct = tasks.length > 0 ? Math.round((approvedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 text-left"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        <div className="flex-1">
          <h3 className="font-bold text-slate-900">{phase.title}</h3>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>{approvedCount}/{tasks.length}</span>
          <div className="w-20">
            <Progress value={pct} className="h-1.5" />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="pl-7 space-y-2">
          {tasks.map(task => {
            const submission = submissions.find(s => s.task_id === task.id);
            return (
              <TaskCard
                key={task.id}
                task={task}
                submission={submission}
                enrollment={enrollment}
                isLocked={isTaskLocked(task)}
                phases={[phase]}
                onSubmissionUpdate={() => queryClient.invalidateQueries({ queryKey: ['sim-task-submissions-student', enrollment.id] })}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StudentProjectView({ enrollment, project, currentUser, onBack, previewMode }) {
  const queryClient = useQueryClient();

  const { data: enrollmentData, refetch: refetchEnrollment } = useQuery({
    queryKey: ['sim-enrollment', enrollment.id],
    queryFn: () => base44.entities.SimProjectEnrollment.filter({ id: enrollment.id }).then(r => r[0] || enrollment),
  });

  const activeEnrollment = enrollmentData || enrollment;

  const { data: phases = [] } = useQuery({
    queryKey: ['sim-phases', project?.id],
    queryFn: () => base44.entities.SimProjectPhase.filter({ project_id: project.id }),
    enabled: !!project?.id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['sim-tasks', project?.id],
    queryFn: () => base44.entities.SimProjectTask.filter({ project_id: project.id }),
    enabled: !!project?.id,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['sim-task-submissions-student', enrollment.id],
    queryFn: () => base44.entities.SimTaskSubmission.filter({ enrollment_id: enrollment.id }),
  });

  if (!project) return <div className="p-8 text-center text-slate-400">Project not found.</div>;

  const needsOnboarding = !activeEnrollment.onboarding_video_watched || !activeEnrollment.onboarding_agreement_signed;

  const approvedCount = tasks.filter(t => submissions.find(s => s.task_id === t.id && s.status === 'approved')).length;
  const totalPct = tasks.length > 0 ? Math.round((approvedCount / tasks.length) * 100) : 0;
  const sortedPhases = [...phases].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Button>
          <div className="flex-1">
            {previewMode && (
              <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full mr-2">PREVIEW MODE</span>
            )}
            <p className="text-xs text-slate-400 font-medium">{project.company_name}</p>
            <h1 className="text-xl font-bold text-slate-900">{project.title}</h1>
          </div>
          {!needsOnboarding && (
            <div className="text-right">
              <p className="text-xs text-slate-400">{totalPct}% complete</p>
              <Progress value={totalPct} className="h-2 w-24 mt-1" />
            </div>
          )}
        </div>

        {needsOnboarding ? (
          <OnboardingGate
            project={project}
            enrollment={activeEnrollment}
            onComplete={() => refetchEnrollment()}
          />
        ) : (
          <div className="space-y-6">
            {/* Overview Card */}
            {project.overview && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-sm text-slate-600">{project.overview}</p>
              </div>
            )}

            {/* Phases */}
            {sortedPhases.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400 text-sm">
                No phases have been added to this project yet.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6">
                {sortedPhases.map(phase => {
                  const phaseTasks = tasks.filter(t => t.phase_id === phase.id).sort((a, b) => a.sort_order - b.sort_order);
                  return (
                    <PhaseSection
                      key={phase.id}
                      phase={phase}
                      tasks={phaseTasks}
                      submissions={submissions}
                      enrollment={activeEnrollment}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}