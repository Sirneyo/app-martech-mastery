import React, { useEffect, useState } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function StudentCertificationLoading() {
  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('id');

  const [stage, setStage] = useState(0);
  const [error, setError] = useState(null);

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

  const stages = [
    'Gathering your questions...',
    'Randomising your sections...',
    'Preparing exam environment...',
    'Securing your attempt...',
    'Almost there...'
  ];

  useEffect(() => {
    if (!user?.id || !attempt?.id) return;

    // Validate access
    if (attempt.student_user_id !== user.id) {
      setError('Access denied: This attempt belongs to another student.');
      return;
    }

    if (!['prepared'].includes(attempt.attempt_status)) {
      setError('This attempt has already been started or submitted.');
      return;
    }

    let stageInterval;

    const loadAttempt = async () => {
      try {
        // Progress through stages
        stageInterval = setInterval(() => {
          setStage(prev => Math.min(prev + 1, stages.length - 1));
        }, 600);

        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Clear interval and redirect to ready screen
        clearInterval(stageInterval);
        setTimeout(() => {
          window.location.href = createPageUrl(`StudentCertificationReady?id=${attempt.id}`);
        }, 500);
      } catch (error) {
        clearInterval(stageInterval);
        console.error('Error loading exam attempt:', error);
        setError(error.message);
      }
    };

    loadAttempt();

    return () => {
      if (stageInterval) clearInterval(stageInterval);
    };
  }, [user?.id, attempt?.id, attempt?.student_user_id, attempt?.attempt_status]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md shadow-lg border border-red-200"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-4">
            Unable to Start Exam
          </h2>
          <p className="text-slate-600 text-center mb-6">
            {error}
          </p>
          <Button
            onClick={() => window.location.href = createPageUrl('StudentCertificationConfirm')}
            className="w-full bg-violet-600 hover:bg-violet-700"
          >
            Back to Confirm
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mb-8">
          <Loader2 className="w-16 h-16 text-violet-600 animate-spin mx-auto mb-4" />
        </div>
        <motion.h2 
          key={stage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-slate-900 mb-2"
        >
          {stages[stage]}
        </motion.h2>
        <p className="text-slate-500">Please wait while we prepare your exam</p>
        
        <div className="mt-8 flex justify-center gap-2">
          {stages.map((_, idx) => (
            <motion.div
              key={idx}
              className={`w-2 h-2 rounded-full ${
                idx <= stage ? 'bg-violet-600' : 'bg-slate-300'
              }`}
              animate={{ scale: idx === stage ? [1, 1.5, 1] : 1 }}
              transition={{ repeat: idx === stage ? Infinity : 0, duration: 1 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}