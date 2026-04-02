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
import { Clock, ChevronLeft, ChevronRight, AlertCircle, List, AlertTriangle, Flag, Shield, Pause, Play, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    queryKey: ['all-questions', attemptQuestions],
    queryFn: async () => {
      if (attemptQuestions.length === 0) return [];
      const questionIds = attemptQuestions.map(aq => aq.question_id);
      const questions = await base44.entities.ExamQuestion.list();
      return questions.filter(q => questionIds.includes(q.id));
    },
    enabled: attemptQuestions.length > 0,
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
    await saveAnswerMutation.mutateAsync({ questionId: currentQuestion.id, answer: currentAnswer });
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex <= (examConfig?.total_questions || 80)) {
      await updateQuestionIndexMutation.mutateAsync(nextIndex);
    }
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
    window.location.href = createPageUrl(`StudentCertificationReady?id=${attemptId}`);
    return null;
  }
  if (attempt?.attempt_status === 'submitted') {
    window.location.href = createPageUrl(`StudentCertificationResults?id=${attemptId}`);
    return null;
  }
  if (!attempt || !examConfig || !currentQuestion || !examRevealed) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6" style={{ background: '#0a0a0f', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.12) 0%, transparent 60%)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-5"
        >
          {/* Spinning ring */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5, ease: 'linear', repeat: Infinity }}
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid transparent', borderTopColor: 'rgba(139,92,246,0.8)', borderRightColor: 'rgba(139,92,246,0.2)' }}
            />
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 0 32px rgba(109,40,217,0.5)' }}>
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-violet-400 text-xs font-bold tracking-widest uppercase mb-2">Secure Exam Environment</p>
            <p className="text-white text-xl font-semibold">{examConfig?.title || 'Preparing…'}</p>
            <p className="text-slate-500 text-sm mt-1">Preparing your exam…</p>
          </div>
          <div className="flex items-center gap-2">
            {[0,1,2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'rgba(139,92,246,0.8)' }}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.22 }}
              />
            ))}
          </div>
        </motion.div>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 flex overflow-hidden"
      style={{ background: '#0a0a0f' }}
    >
      {/* Locked sidebar */}
      <ExamLockedSidebar isPaused={isPaused} />

      {/* Main exam column */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div
          className="flex-shrink-0 px-6 py-3 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-white text-xs font-bold tracking-widest">SECURE EXAM</span>
            </div>
            {violations.length > 0 && (
              <span className="bg-red-500/20 text-red-400 text-xs font-semibold px-2 py-1 rounded-lg border border-red-500/30">
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
              <div className={`flex items-center gap-2 font-mono font-bold px-3 py-1.5 rounded-lg border
                ${isPaused ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                : isTimeCritical ? 'text-red-400 border-red-500/40 bg-red-500/10 animate-pulse'
                : 'text-white border-slate-700 bg-slate-800'}`}>
                <Clock className="w-4 h-4" />
                {isPaused ? 'PAUSED' : formatTime(timeRemaining)}
              </div>
            )}
            {isPaused ? (
              <Button onClick={handleResume} size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-xs">
                <Play className="w-3.5 h-3.5" /> Resume
              </Button>
            ) : (
              <Button onClick={handleManualPause} variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5 text-xs">
                <Pause className="w-3.5 h-3.5" /> Pause
              </Button>
            )}
            {!isPaused && (
              <>
                <Link to={createPageUrl(`StudentCertificationReview?id=${attemptId}`)} className="text-slate-400 hover:text-slate-200 flex items-center gap-1.5 text-xs font-medium">
                  <List className="w-4 h-4" /> Review
                </Link>
                <Button onClick={() => setShowEndExamDialog(true)} variant="outline" size="sm" className="border-red-800 text-red-400 hover:bg-red-900/30 gap-1.5 text-xs">
                  <Flag className="w-3.5 h-3.5" /> End Exam
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex-shrink-0 px-6 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-800 rounded-full h-1.5">
              <motion.div className="h-full bg-violet-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
            </div>
            <span className="text-slate-500 text-xs font-medium flex-shrink-0">{answeredCount}/{totalQuestions} answered</span>
          </div>
          {currentSection && (
            <p className="text-slate-500 text-xs mt-1.5">Section: <span className="text-slate-300">{currentSection.name}</span></p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">

          {/* Question area */}
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                {/* Question card */}
                <div
                  className={`rounded-2xl p-8 mb-6 transition-all ${isPaused ? 'opacity-60 pointer-events-none select-none' : ''}`}
                  style={{ background: 'rgba(255,255,255,0.03)', border: isPaused ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)' }}
                >
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
                    Question {currentQuestionIndex}
                  </p>
                  <h2 className="text-xl font-semibold text-slate-100 leading-relaxed mb-8">
                    {currentQuestion.question_text}
                  </h2>

                  {currentQuestion.question_type === 'single_choice' || currentQuestion.question_type === 'true_false' ? (
                    <RadioGroup value={currentAnswer || ''} onValueChange={(v) => handleAnswerChange(v)}>
                      <div className="space-y-3">
                        {options.map((option) => (
                          <label
                            key={option.key}
                            className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all
                              ${currentAnswer === option.key
                                ? 'border-violet-500 bg-violet-500/10 text-violet-200'
                                : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800'}`}
                          >
                            <RadioGroupItem value={option.key} id={`opt-${option.key}`} className="border-slate-500 text-violet-400" />
                            <span className="font-medium">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </RadioGroup>
                  ) : (
                    <div className="space-y-3">
                      {options.map((option) => (
                        <label
                          key={option.key}
                          className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all
                            ${(Array.isArray(currentAnswer) ? currentAnswer : []).includes(option.key)
                              ? 'border-violet-500 bg-violet-500/10 text-violet-200'
                              : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800'}`}
                        >
                          <Checkbox
                            id={`opt-${option.key}`}
                            checked={(Array.isArray(currentAnswer) ? currentAnswer : []).includes(option.key)}
                            onCheckedChange={() => handleAnswerChange(option.key, true)}
                            className="border-slate-500"
                          />
                          <span className="font-medium">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {showAnswerWarning && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-5 flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">Please select an answer to continue.</span>
                    </motion.div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <div />
                  {isLastQuestion ? (
                    <Button onClick={handleFinalSubmit} disabled={isPaused} className="bg-emerald-600 hover:bg-emerald-700 gap-2 disabled:opacity-30">
                      Submit Exam
                    </Button>
                  ) : (
                    <Button onClick={handleNext} disabled={isPaused} className="bg-violet-600 hover:bg-violet-700 gap-2 disabled:opacity-30">
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Camera sidebar */}
          <div className="flex-shrink-0 w-52 p-4 flex flex-col gap-4 overflow-y-auto" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
            <ExamCameraMonitor ref={cameraRef} studentName={user?.full_name || user?.email} />
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-1">Integrity</p>
              <div className={`text-xs font-bold ${violations.length === 0 ? 'text-emerald-400' : violations.length < 3 ? 'text-amber-400' : 'text-red-400'}`}>
                {violations.length === 0 ? 'Clean session' : `${violations.length} flag${violations.length > 1 ? 's' : ''} logged`}
              </div>
            </div>
          </div>
        </div>

        {/* Pause overlay */}
        <AnimatePresence>
          {isPaused && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 z-40 flex flex-col items-center justify-center gap-6 p-8"
            >
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
                {showFocusWarning ? (
                  <>
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                      <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-white text-xl font-bold mb-2">Exam Paused</h2>
                    <p className="text-slate-400 text-sm mb-1">{focusWarningMessage}</p>
                    <p className="text-red-400 text-xs font-semibold mb-6">This incident has been logged with a timestamp.</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                      <Pause className="w-8 h-8 text-amber-400" />
                    </div>
                    <h2 className="text-white text-xl font-bold mb-2">Exam Paused</h2>
                    <p className="text-slate-400 text-sm mb-6">Timer is frozen. Camera must be active to resume.</p>
                  </>
                )}
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-slate-400 text-xs justify-center mb-3">
                    <Camera className="w-3.5 h-3.5" /> Camera must be active to resume
                  </div>
                  <ExamCameraMonitor ref={cameraRef} studentName={user?.full_name || user?.email} />
                </div>
                <Button onClick={handleResume} size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                  <Play className="w-4 h-4" /> Resume Exam
                </Button>
                <p className="text-slate-600 text-xs mt-3">Navigation is unlocked while paused — use the sidebar to navigate.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* End exam dialog */}
        <Dialog open={showEndExamDialog} onOpenChange={setShowEndExamDialog}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
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
              <Button variant="outline" onClick={() => setShowEndExamDialog(false)} disabled={submittingEarly}
                className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button>
              <Button onClick={() => { setShowEndExamDialog(false); handleEarlySubmit(); }}
                disabled={submittingEarly} className="bg-red-600 hover:bg-red-700">
                {submittingEarly ? 'Submitting…' : 'Submit Now'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>{/* end main exam column */}
    </motion.div>
  );
}