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

      // Validate attempts remaining
      const preparedAttempts = attempts.filter(a => a.prepared_at);
      const attemptsUsed = preparedAttempts.length;
      const attemptsAllowed = examConfig?.attempts_allowed || 2;

      if (attemptsUsed >= attemptsAllowed) {
        setError('No attempts remaining.');
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

      // Validate bank coverage
      const sections = await base44.entities.ExamSection.list('sort_order');
      const questionsPerSection = examConfig.questions_per_section || 20;
      
      for (const section of sections) {
        const sectionQuestions = await base44.entities.ExamQuestion.filter({
          exam_section_id: section.id,
          published_flag: true
        });
        
        if (sectionQuestions.length < questionsPerSection) {
          setError(`Exam not available yet, missing questions in ${section.name}. Need ${questionsPerSection}, have ${sectionQuestions.length}.`);
          setCreating(false);
          return;
        }
      }

      // Create attempt
      const attempt = await base44.entities.ExamAttempt.create({
        student_user_id: user.id,
        cohort_id: membership.cohort_id,
        exam_id: examConfig.id,
        attempt_status: 'prepared',
        prepared_at: new Date().toISOString(),
        current_question_index: 1,
      });

      // Generate and lock questions
      const attemptQuestions = [];
      let globalOrder = 1;
      
      for (const section of sections) {
        const sectionQuestions = await base44.entities.ExamQuestion.filter({
          exam_section_id: section.id,
          published_flag: true
        });
        
        // Shuffle and select questionsPerSection
        const shuffled = sectionQuestions.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, questionsPerSection);
        
        selected.forEach((q, idx) => {
          attemptQuestions.push({
            attempt_id: attempt.id,
            exam_section_id: section.id,
            question_id: q.id,
            order_index: idx + 1,
            global_order: globalOrder++
          });
        });
      }
      
      // Save selected questions
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-8 max-w-2xl shadow-lg border border-slate-200"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Confirm Exam Start
          </h1>
          <p className="text-slate-600">
            Please read the following carefully before proceeding
          </p>
        </div>

        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="space-y-2 mt-2">
              <p className="font-semibold">⚠️ Important Information:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Starting the certification exam will use <strong>1 attempt immediately</strong></li>
                <li>Once your questions are generated, <strong>this cannot be undone</strong></li>
                <li>If you leave, you can return to the same attempt, <strong>but it still counts</strong></li>
                <li>You have <strong>{examConfig?.attempts_allowed || 2} total attempts</strong> available</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        <div className="bg-slate-50 rounded-xl p-6 mb-6">
          <h3 className="font-bold text-slate-900 mb-3">Exam Details:</h3>
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex justify-between">
              <span>Total Questions:</span>
              <span className="font-semibold">{examConfig?.total_questions || 80}</span>
            </div>
            <div className="flex justify-between">
              <span>Pass Requirement:</span>
              <span className="font-semibold">{examConfig?.pass_correct_required || 65} / {examConfig?.total_questions || 80} correct</span>
            </div>
            {examConfig?.duration_minutes && (
              <div className="flex justify-between">
                <span>Time Limit:</span>
                <span className="font-semibold">{examConfig.duration_minutes} minutes</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </Alert>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Type <span className="font-bold text-violet-600">READY</span> to confirm (case-sensitive):
          </label>
          <Input
            value={readyInput}
            onChange={(e) => setReadyInput(e.target.value)}
            placeholder="Type READY here"
            className="text-lg text-center font-semibold"
            disabled={creating}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => window.location.href = createPageUrl('StudentCertification')}
            variant="outline"
            className="flex-1"
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePrepareExam}
            disabled={readyInput !== 'READY' || creating}
            className="flex-1 bg-violet-600 hover:bg-violet-700"
          >
            {creating ? 'Preparing...' : 'Prepare My Exam'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}