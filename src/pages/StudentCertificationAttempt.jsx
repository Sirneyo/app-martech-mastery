import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentCertificationAttempt() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('id');

  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);

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

  // Group questions by section
  const questionsBySection = sections.map(section => {
    const sectionAttemptQs = attemptQuestions
      .filter(aq => aq.exam_section_id === section.id)
      .sort((a, b) => a.order_index - b.order_index);
    
    const sectionQuestions = sectionAttemptQs.map(aq => {
      const question = allQuestions.find(q => q.id === aq.question_id);
      return { ...question, order_index: aq.order_index };
    }).filter(q => q.id);
    
    return { section, questions: sectionQuestions };
  });

  useEffect(() => {
    if (!attempt || !examConfig) return;
    
    const startTime = new Date(attempt.started_at);
    const durationMs = (examConfig.duration_minutes || 60) * 60 * 1000;
    const endTime = startTime.getTime() + durationMs;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        handleSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attempt, examConfig]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Calculate score
      const answerRecords = [];
      let correctCount = 0;
      const totalCount = examConfig.total_questions || 80;

      for (const question of allQuestions) {
        const studentAnswer = answers[question.id];
        const correctAnswer = JSON.parse(question.correct_answer_json);
        
        let isCorrect = false;
        if (studentAnswer) {
          const studentKeys = Array.isArray(studentAnswer) 
            ? studentAnswer.sort() 
            : [studentAnswer];
          const correctKeys = correctAnswer.keys.sort();
          
          isCorrect = JSON.stringify(studentKeys) === JSON.stringify(correctKeys);
        }

        if (isCorrect) correctCount++;

        answerRecords.push({
          attempt_id: attemptId,
          question_id: question.id,
          answer_json: JSON.stringify({ keys: Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer] }),
          is_correct: isCorrect,
          points_earned: isCorrect ? 1 : 0,
        });
      }

      // Create answer records
      await base44.entities.ExamAnswer.bulkCreate(answerRecords);

      // Calculate final score
      const scorePercent = Math.round((correctCount / totalCount) * 100);
      const passCorrectRequired = examConfig.pass_correct_required || 65;
      const passFlag = correctCount >= passCorrectRequired;

      // Update attempt
      await base44.entities.ExamAttempt.update(attemptId, {
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
        const today = new Date().toISOString().split('T')[0];
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

      return { attemptId };
    },
  });

  const handleSubmit = async () => {
    // Check all questions answered
    const unansweredCount = allQuestions.filter(q => !answers[q.id]).length;
    if (unansweredCount > 0) {
      if (!confirm(`${unansweredCount} question(s) not answered. Submit anyway?`)) {
        return;
      }
    }

    await submitMutation.mutateAsync();
    navigate(createPageUrl(`StudentCertificationResults?id=${attemptId}`));
  };

  const handleAnswerChange = (questionId, value, isMulti = false) => {
    if (isMulti) {
      const current = answers[questionId] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      setAnswers({ ...answers, [questionId]: updated });
    } else {
      setAnswers({ ...answers, [questionId]: value });
    }
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!attempt || !examConfig || allQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading exam...</p>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter(k => answers[k]).length;
  const progress = (answeredCount / allQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-slate-200 sticky top-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{examConfig.title}</h1>
              <p className="text-sm text-slate-500 mt-1">
                Question {answeredCount} of {allQuestions.length} answered
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Clock className="w-5 h-5" />
                  {timeRemaining !== null && formatTime(timeRemaining)}
                </div>
                <p className="text-xs text-slate-500">Time remaining</p>
              </div>
              <Button 
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Exam'}
              </Button>
            </div>
          </div>
          <div className="mt-4 bg-slate-100 rounded-full h-2 overflow-hidden">
            <motion.div 
              className="h-full bg-violet-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-8">
          {questionsBySection.map((sectionData, sIdx) => {
            if (sectionData.questions.length === 0) return null;
            
            return (
              <div key={sectionData.section.id}>
                <div className="bg-violet-100 rounded-xl p-4 mb-4 sticky top-24 z-10">
                  <h2 className="text-lg font-bold text-violet-900">{sectionData.section.name}</h2>
                  <p className="text-sm text-violet-700">{sectionData.questions.length} questions</p>
                </div>
                
                <div className="space-y-6">
                  {sectionData.questions.map((question, qIdx) => {
                    const options = JSON.parse(question.options_json);
                    const isAnswered = !!answers[question.id];
                    const globalIndex = questionsBySection
                      .slice(0, sIdx)
                      .reduce((sum, s) => sum + s.questions.length, 0) + qIdx + 1;

                    return (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: qIdx * 0.02 }}
                        className={`bg-white rounded-2xl p-6 shadow-sm border ${
                          isAnswered ? 'border-violet-200' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isAnswered ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {globalIndex}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">
                              {question.question_text}
                            </h3>

                            {question.question_type === 'single_choice' || question.question_type === 'true_false' ? (
                              <RadioGroup
                                value={answers[question.id] || ''}
                                onValueChange={(value) => handleAnswerChange(question.id, value)}
                              >
                                <div className="space-y-3">
                                  {options.map((option) => (
                                    <div
                                      key={option.key}
                                      className="flex items-center space-x-3 p-4 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-all cursor-pointer"
                                    >
                                      <RadioGroupItem value={option.key} id={`${question.id}-${option.key}`} />
                                      <Label
                                        htmlFor={`${question.id}-${option.key}`}
                                        className="flex-1 cursor-pointer font-medium text-slate-700"
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
                                    className="flex items-center space-x-3 p-4 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-all"
                                  >
                                    <Checkbox
                                      id={`${question.id}-${option.key}`}
                                      checked={(answers[question.id] || []).includes(option.key)}
                                      onCheckedChange={() => handleAnswerChange(question.id, option.key, true)}
                                    />
                                    <Label
                                      htmlFor={`${question.id}-${option.key}`}
                                      className="flex-1 cursor-pointer font-medium text-slate-700"
                                    >
                                      {option.label}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-600">
              <AlertCircle className="w-5 h-5" />
              <span>Make sure you've answered all questions before submitting</span>
            </div>
            <Button 
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              size="lg"
              className="bg-violet-600 hover:bg-violet-700"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit Exam'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}