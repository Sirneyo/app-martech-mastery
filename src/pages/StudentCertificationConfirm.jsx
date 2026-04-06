import React, { useState } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';

export default function StudentCertificationConfirm() {
  const [readyInput, setReadyInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
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

  const { data: cohort } = useQuery({
    queryKey: ['my-cohort', membership?.cohort_id],
    queryFn: () => base44.entities.Cohort.filter({ id: membership.cohort_id }).then(r => r[0]),
    enabled: !!membership?.cohort_id,
  });

  const { data: examConfig } = useQuery({
    queryKey: ['exam-config'],
    queryFn: async () => {
      const configs = await base44.entities.ExamConfig.filter({ is_active: true });
      return configs[0];
    },
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['my-exam-attempts', membership?.cohort_id],
    queryFn: async () => {
      if (!user?.id || !membership?.cohort_id) return [];
      return base44.entities.ExamAttempt.filter({ student_user_id: user.id, cohort_id: membership.cohort_id });
    },
    enabled: !!user?.id && !!membership?.cohort_id,
  });

  const handlePrepareExam = async () => {
    if (readyInput !== 'READY') return;
    setCreating(true);
    setError(null);

    try {
      const getCurrentWeek = () => {
        if (!cohort?.start_date) return 0;
        const diffDays = Math.floor((new Date() - new Date(cohort.start_date)) / (1000 * 60 * 60 * 24));
        return Math.floor(diffDays / 7) + 1;
      };

      const currentWeek = getCurrentWeek();
      const unlockWeek = examConfig?.unlock_week || 8;
      if (currentWeek < unlockWeek) {
        setError(`Exam unlocks in week ${unlockWeek}. You are currently in week ${currentWeek}.`);
        setCreating(false);
        return;
      }

      if (attempts.some(a => a.pass_flag)) {
        setError('You have already passed the exam.');
        setCreating(false);
        return;
      }

      const activeAttempt = attempts.find(a => ['prepared', 'in_progress'].includes(a.attempt_status) && !a.submitted_at);
      if (activeAttempt) {
        setError('You already have an active attempt. Please complete or submit it first.');
        setCreating(false);
        return;
      }

      const attemptsUsed = attempts.filter(a => a.prepared_at).length;
      const attemptsAllowed = examConfig?.attempts_allowed || 4;
      const nextAttemptNumber = attemptsUsed + 1;

      if (nextAttemptNumber > attemptsAllowed) {
        setError('No attempts remaining.');
        setCreating(false);
        return;
      }

      if (nextAttemptNumber === 3) {
        const attempt2 = attempts.find(a => a.attempt_number === 2);
        if (!attempt2?.submitted_at) { setError('You must complete your previous attempts first.'); setCreating(false); return; }
        const eligibleAt = new Date(new Date(attempt2.submitted_at).getTime() + (examConfig.cooldown_after_attempt_2_hours || 24) * 3600000);
        if (new Date() < eligibleAt) { setError(`Next attempt available: ${eligibleAt.toLocaleString()}.`); setCreating(false); return; }
      }

      if (nextAttemptNumber === 4) {
        const attempt3 = attempts.find(a => a.attempt_number === 3);
        if (!attempt3?.submitted_at) { setError('You must complete your previous attempts first.'); setCreating(false); return; }
        if (attempt3.pass_flag) { setError('Attempt 3 was passed. No further attempts allowed.'); setCreating(false); return; }
        const eligibleAt = new Date(new Date(attempt3.submitted_at).getTime() + (examConfig.cooldown_after_attempt_3_fail_hours || 48) * 3600000);
        if (new Date() < eligibleAt) { setError(`Next attempt available: ${eligibleAt.toLocaleString()}.`); setCreating(false); return; }
      }

      const questionsPerSection = examConfig.questions_per_section || 20;
      const [sections, allBankQuestions] = await Promise.all([
        base44.entities.ExamSection.list('sort_order'),
        base44.entities.ExamQuestion.filter({ exam_id: examConfig.id, published_flag: true }),
      ]);

      for (const section of sections) {
        const sectionQs = allBankQuestions.filter(q => q.exam_section_id === section.id);
        if (sectionQs.length < questionsPerSection) {
          setError(`Exam not available yet — need ${questionsPerSection} questions in ${section.name}, have ${sectionQs.length}.`);
          setCreating(false);
          return;
        }
      }

      const attempt = await base44.entities.ExamAttempt.create({
        student_user_id: user.id,
        cohort_id: membership.cohort_id,
        exam_id: examConfig.id,
        attempt_number: nextAttemptNumber,
        attempt_status: 'prepared',
        prepared_at: new Date().toISOString(),
        current_question_index: 1,
      });

      const attemptQuestions = [];
      let globalOrder = 1;
      for (const section of sections) {
        const sectionQs = allBankQuestions.filter(q => q.exam_section_id === section.id);
        const selected = sectionQs.sort(() => Math.random() - 0.5).slice(0, questionsPerSection);
        selected.forEach((q, idx) => {
          attemptQuestions.push({ attempt_id: attempt.id, exam_section_id: section.id, question_id: q.id, order_index: idx + 1, global_order: globalOrder++ });
        });
      }
      await base44.entities.ExamAttemptQuestion.bulkCreate(attemptQuestions);

      window.location.href = createPageUrl(`StudentCertificationLoading?id=${attempt.id}`);
    } catch (err) {
      setError(err.message || 'Failed to prepare exam. Please try again.');
      setCreating(false);
    }
  };

  const attemptsUsed = attempts.filter(a => a.prepared_at).length;

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em] mb-3">MarTech Mastery</p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Certification Exam</h1>
          <p className="text-slate-400 text-sm mt-2">Review all requirements before proceeding</p>
        </div>

        <div className="bg-[#181c25] border border-[#2a2f3d] rounded-2xl overflow-hidden">
          {/* Stat row */}
          <div className="grid grid-cols-3 divide-x divide-[#2a2f3d] border-b border-[#2a2f3d]">
            {[
              { label: 'Questions', value: examConfig?.total_questions || 80 },
              { label: 'Pass Mark', value: `${examConfig?.pass_correct_required || 65} correct` },
              { label: 'Attempt', value: `${attemptsUsed + 1} / ${examConfig?.attempts_allowed || 4}` },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-5 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="p-7">
            {/* Rules */}
            <div className="mb-6">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-4">Exam Conditions</p>
              <div className="space-y-3">
                {[
                  'Starting the exam immediately uses one attempt — this cannot be reversed.',
                  'You may resume an active attempt, but it remains counted.',
                  'Your camera must stay active for the full duration of the exam.',
                  'Switching tabs or losing window focus will pause and flag your session.',
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 text-[11px] font-bold text-slate-600 w-5 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <p className="text-sm text-slate-300 leading-relaxed">{rule}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#2a2f3d] my-6" />

            {error && (
              <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-xl p-4 mb-5">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Confirmation input */}
            <div className="mb-5">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Type <span className="text-white">READY</span> to confirm you have read and understood the above
              </label>
              <input
                value={readyInput}
                onChange={(e) => setReadyInput(e.target.value.toUpperCase())}
                placeholder="READY"
                disabled={creating}
                autoComplete="off"
                className="w-full text-center text-lg font-bold text-white py-4 rounded-xl outline-none tracking-[0.25em] placeholder-slate-700 transition-colors disabled:opacity-40"
                style={{
                  background: '#0f1117',
                  border: readyInput === 'READY' ? '1px solid rgba(99,102,241,0.6)' : '1px solid #2a2f3d',
                }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = createPageUrl('StudentCertification')}
                disabled={creating}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors disabled:opacity-30 border border-[#2a2f3d] bg-transparent hover:bg-[#2a2f3d]"
              >
                Cancel
              </button>
              <button
                onClick={handlePrepareExam}
                disabled={readyInput !== 'READY' || creating}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                style={{ background: readyInput === 'READY' ? '#4f46e5' : '#2a2f3d' }}
              >
                {creating ? 'Preparing…' : 'Begin Exam'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}