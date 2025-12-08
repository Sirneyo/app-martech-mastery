import React from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useExamExpiryGuard } from '@/components/ExamExpiryGuard';

export default function StudentCertificationReview() {
  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('id');
  const queryClient = useQueryClient();

  const { data: attempt } = useQuery({
    queryKey: ['exam-attempt', attemptId],
    queryFn: async () => {
      const attempts = await base44.entities.ExamAttempt.filter({ id: attemptId });
      return attempts[0];
    },
    enabled: !!attemptId,
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

  // Expiry guard
  useExamExpiryGuard(attempt, examConfig, attemptQuestions, allQuestions);

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

  const { data: existingAnswers = [] } = useQuery({
    queryKey: ['exam-answers', attemptId],
    queryFn: () => base44.entities.ExamAnswer.filter({ attempt_id: attemptId }),
    enabled: !!attemptId,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['exam-sections'],
    queryFn: () => base44.entities.ExamSection.list('sort_order'),
  });

  const updateQuestionIndexMutation = useMutation({
    mutationFn: (newIndex) => 
      base44.entities.ExamAttempt.update(attemptId, { current_question_index: newIndex }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-attempt', attemptId] });
      window.location.href = createPageUrl(`StudentCertificationAttempt?id=${attemptId}`);
    },
  });

  const handleQuestionClick = (globalOrder) => {
    updateQuestionIndexMutation.mutate(globalOrder);
  };

  if (!attempt || !examConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const totalQuestions = examConfig.total_questions || 80;
  const answeredCount = existingAnswers.length;
  const unansweredCount = totalQuestions - answeredCount;

  // Group questions by section
  const questionsBySection = sections.map(section => {
    const sectionQuestions = attemptQuestions
      .filter(aq => aq.exam_section_id === section.id)
      .sort((a, b) => a.global_order - b.global_order);
    return { section, questions: sectionQuestions };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-5xl mx-auto px-6">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
          <div className="mb-8">
            <Button
              onClick={() => window.location.href = createPageUrl(`StudentCertificationAttempt?id=${attemptId}`)}
              variant="outline"
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Exam
            </Button>
            <h1 className="text-3xl font-bold text-slate-900">Exam Review</h1>
            <p className="text-slate-500 mt-1">
              {answeredCount} of {totalQuestions} questions answered
            </p>
          </div>

          {unansweredCount > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 font-medium">
                You have {unansweredCount} unanswered question{unansweredCount !== 1 ? 's' : ''}. 
                Please answer all questions before submitting.
              </p>
            </div>
          )}

          <div className="space-y-8">
            {questionsBySection.map(({ section, questions }) => (
              <div key={section.id}>
                <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                  {section.name}
                </h3>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                  {questions.map((aq) => {
                    const isAnswered = existingAnswers.some(a => a.question_id === aq.question_id);
                    return (
                      <motion.button
                        key={aq.question_id}
                        onClick={() => handleQuestionClick(aq.global_order)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                          w-12 h-12 rounded-lg font-semibold flex items-center justify-center
                          transition-all duration-200 border-2
                          ${isAnswered 
                            ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200' 
                            : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                          }
                        `}
                      >
                        {aq.global_order}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-6 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-100 border-2 border-green-300"></div>
              <span className="text-sm text-slate-700">Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-slate-100 border-2 border-slate-300"></div>
              <span className="text-sm text-slate-700">Unanswered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}