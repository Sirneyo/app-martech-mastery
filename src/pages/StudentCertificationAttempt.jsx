import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, ChevronLeft, ChevronRight, AlertCircle, List, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useExamExpiryGuard } from '@/components/ExamExpiryGuard';

export default function StudentCertificationAttempt() {
  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);

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

  // Get current question based on attempt's current_question_index
  const currentQuestionIndex = attempt?.current_question_index || 1;
  const currentAttemptQuestion = attemptQuestions.find(aq => aq.global_order === currentQuestionIndex);
  const currentQuestion = allQuestions.find(q => q.id === currentAttemptQuestion?.question_id);
  const currentSection = sections.find(s => s.id === currentAttemptQuestion?.exam_section_id);

  // Expiry guard
  useExamExpiryGuard(attempt, examConfig, attemptQuestions, allQuestions);

  // Load existing answer for current question
  useEffect(() => {
    if (!currentQuestion?.id) return;
    const existingAnswer = existingAnswers.find(a => a.question_id === currentQuestion.id);
    if (existingAnswer) {
      const parsed = JSON.parse(existingAnswer.answer_json);
      setCurrentAnswer(parsed.keys.length === 1 ? parsed.keys[0] : parsed.keys);
    } else {
      setCurrentAnswer(null);
    }
    setShowWarning(false);
  }, [currentQuestion?.id, existingAnswers]);

  // Timer
  useEffect(() => {
    if (!attempt?.expires_at) return;
    
    const expiresAt = new Date(attempt.expires_at).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        handleFinalSubmit();
      }
    }, 1000);

    // Set initial time
    setTimeRemaining(Math.max(0, expiresAt - Date.now()));

    return () => clearInterval(interval);
  }, [attempt?.expires_at]);

  const saveAnswerMutation = useMutation({
    mutationFn: async ({ questionId, answer }) => {
      const answerJson = JSON.stringify({ 
        keys: Array.isArray(answer) ? answer : [answer] 
      });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-answers', attemptId] });
    },
  });

  const updateQuestionIndexMutation = useMutation({
    mutationFn: (newIndex) => 
      base44.entities.ExamAttempt.update(attemptId, { current_question_index: newIndex }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-attempt', attemptId] });
    },
  });

  const handleNext = async () => {
    if (!currentAnswer) {
      setShowWarning(true);
      return;
    }

    // Save current answer
    await saveAnswerMutation.mutateAsync({ 
      questionId: currentQuestion.id, 
      answer: currentAnswer 
    });

    // Move to next question
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex <= (examConfig?.total_questions || 80)) {
      await updateQuestionIndexMutation.mutateAsync(nextIndex);
    }
  };

  const handlePrevious = async () => {
    // Save current answer if exists
    if (currentAnswer) {
      await saveAnswerMutation.mutateAsync({ 
        questionId: currentQuestion.id, 
        answer: currentAnswer 
      });
    }

    // Move to previous question
    const prevIndex = currentQuestionIndex - 1;
    if (prevIndex >= 1) {
      await updateQuestionIndexMutation.mutateAsync(prevIndex);
    }
  };

  const handleFinalSubmit = async () => {
    // Check all questions answered
    const totalQuestions = examConfig?.total_questions || 80;
    const answeredCount = existingAnswers.length;
    
    if (answeredCount < totalQuestions) {
      window.location.href = createPageUrl(`StudentCertificationReview?id=${attemptId}`);
      return;
    }

    // Calculate score
    let correctCount = 0;

    for (const attemptQ of attemptQuestions) {
      const question = allQuestions.find(q => q.id === attemptQ.question_id);
      const answer = existingAnswers.find(a => a.question_id === attemptQ.question_id);
      
      if (!question || !answer) continue;

      const correctAnswer = JSON.parse(question.correct_answer_json);
      const studentAnswer = JSON.parse(answer.answer_json);
      
      const studentKeys = studentAnswer.keys.sort();
      const correctKeys = correctAnswer.keys.sort();
      
      const isCorrect = JSON.stringify(studentKeys) === JSON.stringify(correctKeys);
      
      if (isCorrect) correctCount++;

      // Update answer with is_correct
      await base44.entities.ExamAnswer.update(answer.id, {
        is_correct: isCorrect,
        points_earned: isCorrect ? 1 : 0,
      });
    }

    // Calculate final score
    const scorePercent = Math.round((correctCount / totalQuestions) * 100);
    const passCorrectRequired = examConfig.pass_correct_required || 65;
    const passFlag = correctCount >= passCorrectRequired;

    // Update attempt
    await base44.entities.ExamAttempt.update(attemptId, {
      attempt_status: 'submitted',
      submitted_at: new Date().toISOString(),
      score_percent: scorePercent,
      pass_flag: passFlag,
    });

    // If passed, handle certificate, portfolio, and points
    if (passFlag) {
      const user = await base44.auth.me();
      
      // Create certificate
      const existingCerts = await base44.entities.Certificate.filter({
        student_user_id: attempt.student_user_id,
        cohort_id: attempt.cohort_id,
      });

      if (existingCerts.length === 0) {
        await base44.entities.Certificate.create({
          cohort_id: attempt.cohort_id,
          student_user_id: attempt.student_user_id,
          issued_at: new Date().toISOString(),
          certificate_id_code: `MM-${attempt.cohort_id.slice(-6)}-${attemptId.slice(-6)}`,
        });
      }

      // Auto-approve portfolio item
      const templates = await base44.entities.PortfolioItemTemplate.filter({ key: 'mm_cert_exam' });
      if (templates.length > 0) {
        const template = templates[0];
        const existingStatus = await base44.entities.PortfolioItemStatus.filter({
          user_id: attempt.student_user_id,
          cohort_id: attempt.cohort_id,
          portfolio_item_id: template.id,
        });

        if (existingStatus.length > 0) {
          await base44.entities.PortfolioItemStatus.update(existingStatus[0].id, {
            status: 'approved',
          });
        } else {
          await base44.entities.PortfolioItemStatus.create({
            user_id: attempt.student_user_id,
            cohort_id: attempt.cohort_id,
            portfolio_item_id: template.id,
            status: 'approved',
          });
        }
      }

      // Award points
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

  const handleAnswerChange = (value, isMulti = false) => {
    if (isMulti) {
      const current = Array.isArray(currentAnswer) ? currentAnswer : [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      setCurrentAnswer(updated);
    } else {
      setCurrentAnswer(value);
    }
    setShowWarning(false);
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Access control and status guards
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

  if (!attempt || !examConfig || !currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading exam...</p>
      </div>
    );
  }

  const totalQuestions = examConfig.total_questions || 80;
  const answeredCount = existingAnswers.length;
  const progress = (answeredCount / totalQuestions) * 100;
  const isLastQuestion = currentQuestionIndex === totalQuestions;

  const options = JSON.parse(currentQuestion.options_json);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top Status Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Alert className="mb-3 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              <strong>Timer is running.</strong> Leaving the exam will not pause time.
            </AlertDescription>
          </Alert>
          
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{examConfig.title}</h1>
              <p className="text-sm text-slate-500">
                Question {currentQuestionIndex} of {totalQuestions}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {timeRemaining !== null && (
                <div className={`flex items-center gap-2 font-bold ${
                  timeRemaining < 600000 ? 'text-red-600' : 'text-slate-900'
                }`}>
                  <Clock className="w-5 h-5" />
                  <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
                </div>
              )}
              <Link 
                to={createPageUrl(`StudentCertificationReview?id=${attemptId}`)}
                className="text-violet-600 hover:text-violet-700 flex items-center gap-2 text-sm font-medium"
              >
                <List className="w-4 h-4" />
                Review
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="w-full bg-slate-200 rounded-full h-2">
              <motion.div 
                className="h-full bg-violet-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {currentSection && (
              <p className="text-xs text-slate-500 mt-2">
                Section: {currentSection.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Question Panel */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 mb-6"
        >
          <h2 className="text-2xl font-semibold text-slate-900 mb-6">
            {currentQuestion.question_text}
          </h2>

          {currentQuestion.question_type === 'single_choice' || currentQuestion.question_type === 'true_false' ? (
            <RadioGroup
              value={currentAnswer || ''}
              onValueChange={(value) => handleAnswerChange(value)}
            >
              <div className="space-y-3">
                {options.map((option) => (
                  <div
                    key={option.key}
                    className="flex items-center space-x-4 p-4 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-all cursor-pointer"
                  >
                    <RadioGroupItem value={option.key} id={`option-${option.key}`} />
                    <Label
                      htmlFor={`option-${option.key}`}
                      className="flex-1 cursor-pointer font-medium text-slate-700 text-lg"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          ) : (
            <div className="space-y-3">
              {options.map((option) => (
                <div
                  key={option.key}
                  className="flex items-center space-x-4 p-4 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-all"
                >
                  <Checkbox
                    id={`option-${option.key}`}
                    checked={(Array.isArray(currentAnswer) ? currentAnswer : []).includes(option.key)}
                    onCheckedChange={() => handleAnswerChange(option.key, true)}
                  />
                  <Label
                    htmlFor={`option-${option.key}`}
                    className="flex-1 cursor-pointer font-medium text-slate-700 text-lg"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {showWarning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200"
            >
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Please select an answer to continue</span>
            </motion.div>
          )}
        </motion.div>

        {/* Bottom Navigation */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 1}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </Button>

          {isLastQuestion ? (
            <Button
              onClick={handleFinalSubmit}
              size="lg"
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              Submit Exam
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              size="lg"
              className="bg-violet-600 hover:bg-violet-700 gap-2"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}