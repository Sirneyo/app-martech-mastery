import React, { useState, useEffect, useRef } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Clock, ChevronRight, AlertCircle, List, AlertTriangle, Flag, Shield, Pause, Play, Minimize2, Maximize2, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useExamExpiryGuard } from '@/components/ExamExpiryGuard';
import ExamCameraMonitor from '@/components/ExamCameraMonitor';
import ExamLockedSidebar from '@/components/ExamLockedSidebar';

export default function StudentCertificationAttempt() {
  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [examRevealed, setExamRevealed] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [showAnswerWarning, setShowAnswerWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showEndExamDialog, setShowEndExamDialog] = useState(false);
  const [submittingEarly, setSubmittingEarly] = useState(false);

  // Pause / camera re-check state
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState(null);
  const [showFocusWarning, setShowFocusWarning] = useState(false);
  const [focusWarningMessage, setFocusWarningMessage] = useState('');
  const [violations, setViolations] = useState([]);
  const [cameraOkToResume, setCameraOkToResume] = useState(false);

  const cameraRef = useRef(null);
  const screenVideoRef = useRef(null);
  const [screenStream, setScreenStream] = useState(null);
  const [questionsCollapsed, setQuestionsCollapsed] = useState(false);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Pause the exam when the user stops screen sharing
  useEffect(() => {
    if (!screenStream) return;
    const track = screenStream.getVideoTracks()[0];
    if (!track) return;
    const handleEnded = () => {
      setScreenStream(null);
      triggerFocusLoss('Screen sharing was stopped');
    };
    track.addEventListener('ended', handleEnded);
    return () => track.removeEventListener('ended', handleEnded);
  }, [screenStream]);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: attempt } = useQuery({
    queryKey: ['exam-attempt', attemptId],
    queryFn: async () => {
      const attempts = await base44.entities.ExamAttempt.filter({ id: attemptId });
      return attempts[0];
    },
    enabled: !!attemptId,
  });

  const { data: examConfig } = useQuery({
    queryKey: ['exam-config', attempt?.exam_id],
    queryFn: async () => {
      const configs = await base44.entities.ExamConfig.filter({ id: attempt.exam_id });
      return configs[0];
    },
    enabled: !!attempt?.exam_id,
  });

  const { data: attemptQuestions = [] } = useQuery({
    queryKey: ['exam-attempt-questions', attemptId],
    queryFn: () => base44.entities.ExamAttemptQuestion.filter({ attempt_id: attemptId }),
    enabled: !!attemptId,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['exam-sections'],
    queryFn: () => base44.entities.ExamSection.list('sort_order'),
  });

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['all-questions', attempt?.exam_id],
    queryFn: async () => {
      if (!attempt?.exam_id) return [];
      return base44.entities.ExamQuestion.filter({ exam_id: attempt.exam_id, published_flag: true });
    },
    enabled: !!attempt?.exam_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: existingAnswers = [] } = useQuery({
    queryKey: ['exam-answers', attemptId],
    queryFn: () => base44.entities.ExamAnswer.filter({ attempt_id: attemptId }),
    enabled: !!attemptId,
  });

  const currentQuestionIndex = attempt?.current_question_index || 1;
  const currentAttemptQuestion = attemptQuestions.find(aq => aq.global_order === currentQuestionIndex);
  const currentQuestion = allQuestions.find(q => q.id === currentAttemptQuestion?.question_id);
  const currentSection = sections.find(s => s.id === currentAttemptQuestion?.exam_section_id);

  // Trigger entrance animation once data is ready
  useEffect(() => {
    if (attempt && examConfig && currentQuestion && !examRevealed) {
      const t = setTimeout(() => setExamRevealed(true), 100);
      return () => clearTimeout(t);
    }
  }, [attempt, examConfig, currentQuestion]);

  useExamExpiryGuard(attempt, examConfig, attemptQuestions, allQuestions);

  // Load existing answer
  useEffect(() => {
    if (!currentQuestion?.id) return;
    const existingAnswer = existingAnswers.find(a => a.question_id === currentQuestion.id);
    if (existingAnswer) {
      const parsed = JSON.parse(existingAnswer.answer_json);
      setCurrentAnswer(parsed.keys.length === 1 ? parsed.keys[0] : parsed.keys);
    } else {
      setCurrentAnswer(null);
    }
    setShowAnswerWarning(false);
  }, [currentQuestion?.id, existingAnswers]);

  // Timer — stops when paused
  useEffect(() => {
    if (!attempt?.expires_at || isPaused) return;

    const expiresAt = new Date(attempt.expires_at).getTime();
    const interval = setInterval(() => {
      const remaining = Math.max(0, expiresAt - Date.now());
      setTimeRemaining(remaining);
      if (remaining === 0) handleFinalSubmit();
    }, 1000);

    setTimeRemaining(Math.max(0, expiresAt - Date.now()));
    return () => clearInterval(interval);
  }, [attempt?.expires_at, isPaused]);

  // Tab / focus lockdown — auto-pause on switch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !isPaused) {
        triggerFocusLoss('Tab switch detected');
      }
    };
    const handleBlur = () => {
      if (!isPaused) triggerFocusLoss('Window focus lost');
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isPaused]);

  const triggerFocusLoss = (reason) => {
    const entry = { reason, timestamp: new Date().toISOString() };
    setViolations(prev => [...prev, entry]);
    setFocusWarningMessage(reason);
    setShowFocusWarning(true);
    setIsPaused(true);
    setPausedAt(new Date());
    setCameraOkToResume(false);
  };

  const handleManualPause = () => {
    setIsPaused(true);
    setPausedAt(new Date());
    setCameraOkToResume(false);
  };

  const handleResume = async () => {
    // Re-check camera before resuming
    const ok = await cameraRef.current?.checkCamera();
    if (ok) {
      setIsPaused(false);
      setShowFocusWarning(false);
      setCameraOkToResume(false);
    } else {
      setCameraOkToResume(false);
      alert('Camera is not available. Please allow camera access to resume.');
    }
  };

  const saveAnswerMutation = useMutation({
    mutationFn: async ({ questionId, answer }) => {
      const answerJson = JSON.stringify({ keys: Array.isArray(answer) ? answer : [answer] });
      const existing = existingAnswers.find(a => a.question_id === questionId);
      if (existing) {
        await base44.entities.ExamAnswer.update(existing.id, { answer_json: answerJson });
      } else {
        await base44.entities.ExamAnswer.create({
          attempt_id: attemptId,
          question_id: questionId,
          answer_json: answerJson,
          is_correct: false,
          points_earned: 0,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exam-answers', attemptId] }),
  });

  const updateQuestionIndexMutation = useMutation({
    mutationFn: (newIndex) =>
      base44.entities.ExamAttempt.update(attemptId, { current_question_index: newIndex }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exam-attempt', attemptId] }),
  });

  const handleNext = async () => {
    if (!currentAnswer) { setShowAnswerWarning(true); return; }
    const nextIndex = currentQuestionIndex + 1;
    const total = examConfig?.total_questions || 80;
    // Fire both mutations in parallel — no need to wait for answer save before moving index
    await Promise.all([
      saveAnswerMutation.mutateAsync({ questionId: currentQuestion.id, answer: currentAnswer }),
      nextIndex <= total ? updateQuestionIndexMutation.mutateAsync(nextIndex) : Promise.resolve(),
    ]);
  };

  const handleEarlySubmit = async () => {
    setSubmittingEarly(true);
    await performSubmit();
  };

  const performSubmit = async () => {
    const totalQuestions = examConfig?.total_questions || 80;
    let correctCount = 0;

    for (const attemptQ of attemptQuestions) {
      const question = allQuestions.find(q => q.id === attemptQ.question_id);
      const answer = existingAnswers.find(a => a.question_id === attemptQ.question_id);
      if (!question || !answer) continue;

      const correctAnswer = JSON.parse(question.correct_answer_json);
      const studentAnswer = JSON.parse(answer.answer_json);
      const isCorrect = JSON.stringify(studentAnswer.keys.sort()) === JSON.stringify(correctAnswer.keys.sort());
      if (isCorrect) correctCount++;

      await base44.entities.ExamAnswer.update(answer.id, {
        is_correct: isCorrect,
        points_earned: isCorrect ? 1 : 0,
      });
    }

    const scorePercent = Math.round((correctCount / totalQuestions) * 100);
    const passCorrectRequired = examConfig.pass_correct_required || 65;
    const passFlag = correctCount >= passCorrectRequired;

    await base44.entities.ExamAttempt.update(attemptId, {
      attempt_status: 'submitted',
      submitted_at: new Date().toISOString(),
      score_percent: scorePercent,
      pass_flag: passFlag,
    });

    if (passFlag) {
      const existingCerts = await base44.entities.Certificate.filter({
        student_user_id: attempt.student_user_id,
        cohort_id: attempt.cohort_id,
      });

      if (existingCerts.length === 0) {
        const cert = await base44.entities.Certificate.create({
          cohort_id: attempt.cohort_id,
          student_user_id: attempt.student_user_id,
          issued_at: new Date().toISOString(),
          certificate_id_code: `MM-${attempt.cohort_id.slice(-6)}-${attemptId.slice(-6)}`,
        });
        await base44.functions.invoke('generateCertificate', { certificate_id: cert.id });
      }

      const templates = await base44.entities.PortfolioItemTemplate.filter({ key: 'mm_cert_exam' });
      if (templates.length > 0) {
        const template = templates[0];
        const existingStatus = await base44.entities.PortfolioItemStatus.filter({
          user_id: attempt.student_user_id,
          cohort_id: attempt.cohort_id,
          portfolio_item_id: template.id,
        });
        if (existingStatus.length > 0) {
          await base44.entities.PortfolioItemStatus.update(existingStatus[0].id, { status: 'approved' });
        } else {
          await base44.entities.PortfolioItemStatus.create({
            user_id: attempt.student_user_id,
            cohort_id: attempt.cohort_id,
            portfolio_item_id: template.id,
            status: 'approved',
          });
        }
      }

      const existingPoints = await base44.entities.PointsLedger.filter({
        user_id: attempt.student_user_id,
        source_type: 'exam',
        source_id: attemptId,
      });
      if (existingPoints.length === 0) {
        await base44.entities.PointsLedger.create({
          user_id: attempt.student_user_id,
          points: 100,
          reason: 'exam_passed',
          source_type: 'exam',
          source_id: attemptId,
        });
      }
    }

    window.location.href = createPageUrl(`StudentCertificationResults?id=${attemptId}`);
  };

  const handleFinalSubmit = async () => {
    const totalQuestions = examConfig?.total_questions || 80;
    if (existingAnswers.length < totalQuestions) {
      window.location.href = createPageUrl(`StudentCertificationReview?id=${attemptId}`);
      return;
    }
    await performSubmit();
  };

  const handleAnswerChange = (value, isMulti = false) => {
    if (isMulti) {
      const current = Array.isArray(currentAnswer) ? currentAnswer : [];
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      setCurrentAnswer(updated);
    } else {
      setCurrentAnswer(value);
    }
    setShowAnswerWarning(false);
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Access / status guards
  if (attempt && user && attempt.student_user_id !== user.id) {
    window.location.href = createPageUrl('StudentCertification');
    return null;
  }
  if (attempt?.attempt_status === 'prepared' && !attempt.started_at) {
    window.location.href = createPageUrl(`StudentCertificationLoading?id=${attemptId}`);
    return null;
  }
  if (attempt?.attempt_status === 'submitted') {
    window.location.href = createPageUrl(`StudentCertificationResults?id=${attemptId}`);
    return null;
  }
  if (!attempt || !examConfig || !currentQuestion || !examRevealed) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4" style={{ background: '#0f1117' }}>
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">{examConfig?.title || 'Loading exam…'}</p>
        <p className="text-white text-sm">Preparing your questions…</p>
      </div>
    );
  }

  const totalQuestions = examConfig.total_questions || 80;
  const answeredCount = existingAnswers.length;
  const progress = (answeredCount / totalQuestions) * 100;
  const isLastQuestion = currentQuestionIndex === totalQuestions;
  const isTimeCritical = timeRemaining !== null && timeRemaining < 600000;
  const options = JSON.parse(currentQuestion.options_json);

  return (
    <div className="fixed inset-0 flex overflow-hidden" style={{ background: '#0f1117' }}>
      {/* Locked sidebar */}
      <ExamLockedSidebar isPaused={isPaused} />

      {/* Main exam column */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex-shrink-0 px-6 py-3 flex items-center justify-between" style={{ background: '#181c25', borderBottom: '1px solid #2a2f3d' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0f1117] border border-[#2a2f3d]">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-white text-xs font-bold tracking-widest">SECURE EXAM</span>
            </div>
            {violations.length > 0 && (
              <span className="bg-red-500/10 text-red-400 text-xs font-semibold px-2 py-1 rounded-lg border border-red-500/20">
                {violations.length} flag{violations.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="hidden md:block text-center">
            <p className="text-slate-200 text-sm font-semibold">{examConfig.title}</p>
            <p className="text-slate-500 text-xs">Question {currentQuestionIndex} of {totalQuestions}</p>
          </div>

          <div className="flex items-center gap-3">
            {timeRemaining !== null && (
              <div className={`flex items-center gap-2 font-mono font-bold px-3 py-1.5 rounded-lg border text-sm
                ${isPaused ? 'text-amber-400 border-amber-500/30 bg-amber-500/8'
                : isTimeCritical ? 'text-red-400 border-red-500/30 bg-red-500/8'
                : 'text-white border-[#2a2f3d] bg-[#0f1117]'}`}>
                <Clock className="w-4 h-4" />
                {isPaused ? 'PAUSED' : formatTime(timeRemaining)}
              </div>
            )}
            {isPaused ? (
              <button onClick={handleResume} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors">
                <Play className="w-3.5 h-3.5" /> Resume
              </button>
            ) : (
              <button onClick={handleManualPause} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 border border-[#2a2f3d] hover:bg-[#2a2f3d] transition-colors">
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
            )}
            {!isPaused && (
              <>
                <Link to={createPageUrl(`StudentCertificationReview?id=${attemptId}`)} className="text-slate-400 hover:text-slate-200 flex items-center gap-1.5 text-xs font-medium transition-colors">
                  <List className="w-4 h-4" /> Review
                </Link>
                <button onClick={() => setShowEndExamDialog(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/8 transition-colors">
                  <Flag className="w-3.5 h-3.5" /> End Exam
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex-shrink-0 px-6 py-3" style={{ borderBottom: '1px solid #2a2f3d', background: '#181c25' }}>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-800 rounded-full h-1.5">
              <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-slate-500 text-xs font-medium flex-shrink-0">{answeredCount}/{totalQuestions} answered</span>
          </div>
          {currentSection && (
            <p className="text-slate-500 text-xs mt-1.5">Section: <span className="text-slate-300">{currentSection.name}</span></p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">

          {/* Collapse toggle */}
          {questionsCollapsed && (
            <div className="flex-shrink-0 w-12 flex flex-col items-center justify-start pt-6" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setQuestionsCollapsed(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-2 rounded-lg hover:bg-slate-800"
                title="Expand questions"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Question area */}
          <div className={`${questionsCollapsed ? 'hidden' : 'flex-1'} overflow-y-auto px-8 py-8`}>
            <div key={currentQuestionIndex}>
                {/* Question card */}
                <div
                  className={`rounded-xl p-8 mb-6 transition-opacity ${isPaused ? 'opacity-40 pointer-events-none select-none' : ''}`}
                  style={{ background: '#181c25', border: '1px solid #2a2f3d' }}
                >
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-4">
                    Question {currentQuestionIndex} of {totalQuestions}
                  </p>
                  <h2 className="text-lg font-semibold text-slate-100 leading-relaxed mb-8">
                    {currentQuestion.question_text}
                  </h2>

                  {currentQuestion.question_type === 'single_choice' || currentQuestion.question_type === 'true_false' ? (
                    <RadioGroup value={currentAnswer || ''} onValueChange={(v) => handleAnswerChange(v)}>
                      <div className="space-y-2.5">
                        {options.map((option) => (
                          <label
                            key={option.key}
                            className={`flex items-center gap-4 px-5 py-4 rounded-xl border cursor-pointer transition-colors
                              ${currentAnswer === option.key
                                ? 'border-indigo-500 bg-indigo-500/8 text-slate-100'
                                : 'border-[#2a2f3d] bg-[#0f1117] text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                          >
                            <RadioGroupItem value={option.key} id={`opt-${option.key}`} className="border-slate-600 text-indigo-400" />
                            <span className="text-sm font-medium">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </RadioGroup>
                  ) : (
                    <div className="space-y-2.5">
                      {options.map((option) => (
                        <label
                          key={option.key}
                          className={`flex items-center gap-4 px-5 py-4 rounded-xl border cursor-pointer transition-colors
                            ${(Array.isArray(currentAnswer) ? currentAnswer : []).includes(option.key)
                              ? 'border-indigo-500 bg-indigo-500/8 text-slate-100'
                              : 'border-[#2a2f3d] bg-[#0f1117] text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                        >
                          <Checkbox
                            id={`opt-${option.key}`}
                            checked={(Array.isArray(currentAnswer) ? currentAnswer : []).includes(option.key)}
                            onCheckedChange={() => handleAnswerChange(option.key, true)}
                            className="border-slate-600"
                          />
                          <span className="text-sm font-medium">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {showAnswerWarning && (
                    <div className="mt-5 flex items-center gap-2 text-amber-400 bg-amber-500/8 border border-amber-500/20 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">Please select an answer to continue.</span>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setQuestionsCollapsed(true)}
                    className="flex items-center gap-1.5 text-slate-600 hover:text-slate-400 text-xs transition-colors"
                    title="Collapse questions panel"
                  >
                    <Minimize2 className="w-3.5 h-3.5" /> Collapse
                  </button>
                  {isLastQuestion ? (
                    <button onClick={handleFinalSubmit} disabled={isPaused} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      Submit Exam
                    </button>
                  ) : (
                    <button onClick={handleNext} disabled={isPaused} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
            </div>
          </div>

          {/* Camera + Screen share sidebar */}
          <div className="flex-shrink-0 w-56 flex flex-col gap-0 overflow-y-auto" style={{ borderLeft: '1px solid #2a2f3d', background: '#181c25' }}>
            <div className="p-3">
              <ExamCameraMonitor ref={cameraRef} studentName={user?.full_name || user?.email} />
            </div>

            {/* Screen share preview */}
            <div className="border-t border-[#2a2f3d]">
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Screen Share</span>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ${screenStream ? 'bg-emerald-400' : 'bg-red-500'}`} />
              </div>
              <div className="relative bg-[#0f1117]" style={{ aspectRatio: '16/10' }}>
                {screenStream ? (
                  <video ref={screenVideoRef} autoPlay muted className="w-full h-full object-cover" style={{ display: 'block' }} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                    <Monitor className="w-5 h-5 text-slate-700" />
                    <button
                      onClick={async () => {
                        try {
                          const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always', displaySurface: 'monitor' }, audio: false });
                          setScreenStream(stream);
                        } catch {}
                      }}
                      className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors underline text-center"
                    >
                      Click to share screen
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Integrity */}
            <div className="border-t border-[#2a2f3d] px-4 py-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Session Integrity</p>
              <p className={`text-xs font-semibold ${violations.length === 0 ? 'text-emerald-400' : violations.length < 3 ? 'text-amber-400' : 'text-red-400'}`}>
                {violations.length === 0 ? 'No flags' : `${violations.length} incident${violations.length > 1 ? 's' : ''} logged`}
              </p>
            </div>
          </div>
        </div>

        {/* Pause overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-40 flex items-center justify-center p-8" style={{ background: 'rgba(15,17,23,0.96)' }}>
            <div className="w-full max-w-sm bg-[#181c25] border border-[#2a2f3d] rounded-2xl overflow-hidden">
              {/* Status bar */}
              <div className={`px-6 py-3 border-b border-[#2a2f3d] flex items-center gap-2 ${showFocusWarning ? 'bg-red-500/8' : 'bg-amber-500/8'}`}>
                {showFocusWarning
                  ? <><AlertTriangle className="w-4 h-4 text-red-400" /><span className="text-red-400 text-xs font-bold uppercase tracking-widest">Integrity Alert</span></>
                  : <><Pause className="w-4 h-4 text-amber-400" /><span className="text-amber-400 text-xs font-bold uppercase tracking-widest">Exam Paused</span></>}
              </div>
              <div className="p-6">
                <h2 className="text-white text-lg font-bold mb-1.5">{showFocusWarning ? 'Focus Lost' : 'Timer Frozen'}</h2>
                <p className="text-slate-400 text-sm mb-5">
                  {showFocusWarning
                    ? <>{focusWarningMessage}. <span className="text-red-400">This incident has been logged.</span></>
                    : 'Your timer is frozen. Camera must be active to resume.'}
                </p>
                <div className="mb-5 rounded-xl overflow-hidden border border-[#2a2f3d]">
                  <ExamCameraMonitor ref={cameraRef} studentName={user?.full_name || user?.email} />
                </div>
                <button onClick={handleResume} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" /> Resume Exam
                </button>
                <p className="text-slate-600 text-xs text-center mt-3">Sidebar navigation remains available while paused.</p>
              </div>
            </div>
          </div>
        )}

        {/* End exam dialog */}
        <Dialog open={showEndExamDialog} onOpenChange={setShowEndExamDialog}>
          <DialogContent className="border-[#2a2f3d] text-white" style={{ background: '#181c25' }}>
            <DialogHeader>
              <DialogTitle className="text-white">Submit exam now?</DialogTitle>
              <DialogDescription className="space-y-3 pt-4">
                <p className="font-semibold text-slate-200">This will submit your exam immediately.</p>
                <ul className="list-disc list-inside space-y-2 text-sm text-slate-400">
                  <li>Any unanswered questions will be marked incorrect.</li>
                  <li>This counts as a completed attempt and cannot be undone.</li>
                  <li>You will not be able to resume this attempt.</li>
                </ul>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button onClick={() => setShowEndExamDialog(false)} disabled={submittingEarly}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 border border-[#2a2f3d] hover:bg-[#2a2f3d] transition-colors disabled:opacity-30">
                Cancel
              </button>
              <button onClick={() => { setShowEndExamDialog(false); handleEarlySubmit(); }}
                disabled={submittingEarly} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50">
                {submittingEarly ? 'Submitting…' : 'Submit Now'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>{/* end main exam column */}
    </div>
  );
}