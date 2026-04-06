import React from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
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

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['all-questions', attempt?.exam_id],
    queryFn: async () => {
      if (!attempt?.exam_id) return [];
      return base44.entities.ExamQuestion.filter({ exam_id: attempt.exam_id, published_flag: true });
    },
    enabled: !!attempt?.exam_id,
    staleTime: 5 * 60 * 1000,
  });

  useExamExpiryGuard(attempt, examConfig, attemptQuestions, allQuestions);

  const updateQuestionIndexMutation = useMutation({
    mutationFn: (newIndex) =>
      base44.entities.ExamAttempt.update(attemptId, { current_question_index: newIndex }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-attempt', attemptId] });
      window.location.href = createPageUrl(`StudentCertificationAttempt?id=${attemptId}`);
    },
  });

  if (!attempt || !examConfig) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    );
  }

  const totalQuestions = examConfig.total_questions || 80;
  const answeredCount = existingAnswers.length;
  const unansweredCount = totalQuestions - answeredCount;

  const questionsBySection = sections.map(section => ({
    section,
    questions: attemptQuestions
      .filter(aq => aq.exam_section_id === section.id)
      .sort((a, b) => a.global_order - b.global_order),
  }));

  return (
    <div className="min-h-screen bg-[#0f1117] py-10">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.location.href = createPageUrl(`StudentCertificationAttempt?id=${attemptId}`)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Exam
          </button>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-2">Exam Review</p>
              <h1 className="text-2xl font-bold text-white">{examConfig.title}</h1>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{answeredCount}<span className="text-slate-500 text-base font-normal"> / {totalQuestions}</span></p>
              <p className="text-xs text-slate-500 mt-0.5">Questions answered</p>
            </div>
          </div>
        </div>

        {unansweredCount > 0 && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            <p className="text-amber-300 text-sm font-medium">
              {unansweredCount} unanswered question{unansweredCount !== 1 ? 's' : ''} — all must be answered before submission.
            </p>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-6">
          {questionsBySection.map(({ section, questions }) => (
            <div key={section.id} className="bg-[#181c25] border border-[#2a2f3d] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#2a2f3d] flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-200">{section.name}</p>
                <p className="text-xs text-slate-500">
                  {questions.filter(aq => existingAnswers.some(a => a.question_id === aq.question_id)).length} / {questions.length} answered
                </p>
              </div>
              <div className="p-5 grid grid-cols-10 gap-2">
                {questions.map((aq) => {
                  const isAnswered = existingAnswers.some(a => a.question_id === aq.question_id);
                  return (
                    <button
                      key={aq.question_id}
                      onClick={() => updateQuestionIndexMutation.mutate(aq.global_order)}
                      title={`Question ${aq.global_order}`}
                      className={`w-full aspect-square rounded-lg text-xs font-bold transition-colors flex items-center justify-center
                        ${isAnswered
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-[#0f1117] text-slate-500 border border-[#2a2f3d] hover:border-slate-500 hover:text-slate-300'
                        }`}
                    >
                      {aq.global_order}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-6 px-4 py-3 bg-[#181c25] border border-[#2a2f3d] rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-indigo-600" />
            <span className="text-xs text-slate-400">Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#0f1117] border border-[#2a2f3d]" />
            <span className="text-xs text-slate-400">Unanswered</span>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => window.location.href = createPageUrl(`StudentCertificationAttempt?id=${attemptId}`)}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Return to Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}