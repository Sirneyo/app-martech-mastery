import React, { useState } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Lock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

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
      const memberships = await base44.entities.CohortMembership.filter({ 
        user_id: user.id, 
        status: 'active' 
      });
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
      return base44.entities.ExamAttempt.filter({
        student_user_id: user.id,
        cohort_id: membership.cohort_id
      });
    },
    enabled: !!user?.id && !!membership?.cohort_id,
  });

  const handlePrepareExam = async () => {
    if (readyInput !== 'READY') return;

    setCreating(true);
    setError(null);

    try {
      // Validate exam is unlocked
      const getCurrentWeek = () => {
        if (!cohort?.start_date) return 0;
        const startDate = new Date(cohort.start_date);
        const today = new Date();
        const diffTime = today - startDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.floor(diffDays / 7) + 1;
      };

      const currentWeek = getCurrentWeek();
      const unlockWeek = examConfig?.unlock_week || 8;

      if (currentWeek < unlockWeek) {
        setError(`Exam unlocks in week ${unlockWeek}. You are currently in week ${currentWeek}.`);
        setCreating(false);
        return;
      }

      // Validate passed
      const hasPassed = attempts.some(a => a.pass_flag);
      if (hasPassed) {
        setError('You have already passed the exam.');
        setCreating(false);
        return;
      }

      // Validate no existing active attempt
      const activeAttempt = attempts.find(a => 
        ['prepared', 'in_progress'].includes(a.attempt_status) && !a.submitted_at
      );

      if (activeAttempt) {
        setError('You already have an active attempt. Please complete or submit it first.');
        setCreating(false);
        return;
      }

      // Validate attempts remaining and calculate next attempt number
      const preparedAttempts = attempts.filter(a => a.prepared_at);
      const attemptsUsed = preparedAttempts.length;
      const attemptsAllowed = examConfig?.attempts_allowed || 4;
      const nextAttemptNumber = attemptsUsed + 1;

      if (nextAttemptNumber > attemptsAllowed) {
        setError('No attempts remaining.');
        setCreating(false);
        return;
      }

      // Cooldown validation for attempt 3
      if (nextAttemptNumber === 3) {
        const attempt2 = attempts.find(a => a.attempt_number === 2);
        if (!attempt2 || !attempt2.submitted_at) {
          setError('You must complete your previous attempts before starting the next one.');
          setCreating(false);
          return;
        }

        const submittedAt = new Date(attempt2.submitted_at);
        const cooldownHours = examConfig.cooldown_after_attempt_2_hours || 24;
        const eligibleAt = new Date(submittedAt.getTime() + cooldownHours * 60 * 60 * 1000);
        const now = new Date();

        if (now < eligibleAt) {
          setError(`Your next attempt will be available on ${eligibleAt.toLocaleString()}.`);
          setCreating(false);
          return;
        }
      }

      // Cooldown validation for attempt 4
      if (nextAttemptNumber === 4) {
        const attempt3 = attempts.find(a => a.attempt_number === 3);
        if (!attempt3 || !attempt3.submitted_at) {
          setError('You must complete your previous attempts before starting the next one.');
          setCreating(false);
          return;
        }

        if (attempt3.pass_flag === true) {
          setError('Attempt 3 was passed. No further attempts allowed.');
          setCreating(false);
          return;
        }

        const submittedAt = new Date(attempt3.submitted_at);
        const cooldownHours = examConfig.cooldown_after_attempt_3_fail_hours || 48;
        const eligibleAt = new Date(submittedAt.getTime() + cooldownHours * 60 * 60 * 1000);
        const now = new Date();

        if (now < eligibleAt) {
          setError(`Your next attempt will be available on ${eligibleAt.toLocaleString()}.`);
          setCreating(false);
          return;
        }
      }

      const questionsPerSection = examConfig.questions_per_section || 20;

      // Fetch sections + ALL exam questions in parallel (single pass, no per-section loops)
      const [sections, allBankQuestions] = await Promise.all([
        base44.entities.ExamSection.list('sort_order'),
        base44.entities.ExamQuestion.filter({ exam_id: examConfig.id, published_flag: true }),
      ]);

      // Validate bank coverage
      for (const section of sections) {
        const sectionQs = allBankQuestions.filter(q => q.exam_section_id === section.id);
        if (sectionQs.length < questionsPerSection) {
          setError(`Exam not available yet — need ${questionsPerSection} questions in ${section.name}, have ${sectionQs.length}.`);
          setCreating(false);
          return;
        }
      }

      // Create the attempt record
      const attempt = await base44.entities.ExamAttempt.create({
        student_user_id: user.id,
        cohort_id: membership.cohort_id,
        exam_id: examConfig.id,
        attempt_number: nextAttemptNumber,
        attempt_status: 'prepared',
        prepared_at: new Date().toISOString(),
        current_question_index: 1,
      });

      // Shuffle & select questions per section (all in memory, no extra API calls)
      const attemptQuestions = [];
      let globalOrder = 1;
      for (const section of sections) {
        const sectionQs = allBankQuestions.filter(q => q.exam_section_id === section.id);
        const selected = sectionQs.sort(() => Math.random() - 0.5).slice(0, questionsPerSection);
        selected.forEach((q, idx) => {
          attemptQuestions.push({
            attempt_id: attempt.id,
            exam_section_id: section.id,
            question_id: q.id,
            order_index: idx + 1,
            global_order: globalOrder++,
          });
        });
      }

      await base44.entities.ExamAttemptQuestion.bulkCreate(attemptQuestions);

      // Redirect to loading page
      window.location.href = createPageUrl(`StudentCertificationLoading?id=${attempt.id}`);
    } catch (error) {
      console.error('Error preparing exam:', error);
      setError(error.message || 'Failed to prepare exam. Please try again.');
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.15) 0%, transparent 60%)' }}>
      {/* Curtain open entrance */}
      <motion.div
        initial={{ opacity: 0, scaleY: 0.92, y: 30 }}
        animate={{ opacity: 1, scaleY: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-xl"
      >
        {/* Glass card */}
        <div className="relative rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
          {/* Top shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)' }} />

          <div className="px-8 pt-10 pb-8">
            {/* Header */}
            <div className="text-center mb-8">
              <p className="text-violet-400 text-xs font-bold tracking-widest uppercase mb-3">MarTech Mastery</p>
              <h1 className="text-3xl font-bold text-white mb-2">Certification Exam</h1>
              <p className="text-slate-400 text-sm">Read the information below carefully before proceeding</p>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Questions', value: examConfig?.total_questions || 80 },
                { label: 'To Pass', value: `${examConfig?.pass_correct_required || 65}/${examConfig?.total_questions || 80}` },
                { label: 'Attempts', value: `${attempts.filter(a=>a.prepared_at).length + 1} of ${examConfig?.attempts_allowed || 4}` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl py-4 px-3 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">{label}</p>
                  <p className="text-lg font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Rules */}
            <div className="rounded-2xl p-5 mb-6 space-y-2.5" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
              {[
                'Starting the exam uses 1 attempt immediately — this cannot be undone',
                'You may leave and return to the same attempt, but it still counts as used',
                'Camera must remain active throughout the exam session',
                'Switching tabs or losing focus will pause and flag your session',
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-slate-300">{rule}</p>
                </div>
              ))}
            </div>

            {error && (
              <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Type READY */}
            <div className="mb-6">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 text-center">
                Type <span className="text-violet-400 font-bold">READY</span> to confirm you understand
              </p>
              <input
                value={readyInput}
                onChange={(e) => setReadyInput(e.target.value)}
                placeholder="READY"
                disabled={creating}
                className="w-full text-center text-xl font-bold text-white py-4 rounded-xl outline-none tracking-widest placeholder-slate-700 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: readyInput === 'READY' ? '1px solid rgba(139,92,246,0.6)' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: readyInput === 'READY' ? '0 0 20px rgba(139,92,246,0.2)' : 'none',
                }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = createPageUrl('StudentCertification')}
                disabled={creating}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-slate-400 transition-all hover:text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cancel
              </button>
              <button
                onClick={handlePrepareExam}
                disabled={readyInput !== 'READY' || creating}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-30"
                style={{ background: readyInput === 'READY' ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(109,40,217,0.3)', boxShadow: readyInput === 'READY' ? '0 8px 24px rgba(109,40,217,0.35)' : 'none' }}
              >
                {creating ? 'Preparing exam…' : 'Prepare My Exam'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}