import React, { useEffect, useState } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function StudentCertificationLoading() {
  const [stage, setStage] = useState(0);
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

  const { data: examConfig } = useQuery({
    queryKey: ['exam-config'],
    queryFn: async () => {
      const configs = await base44.entities.ExamConfig.filter({ is_active: true });
      return configs[0];
    },
  });

  const stages = [
    'Gathering your questions...',
    'Preparing exam environment...',
    'Randomising your sections...',
    'Loading your attempt...',
    "Let's get you certified"
  ];

  useEffect(() => {
    if (!user?.id || !membership?.cohort_id || !examConfig?.id) return;

    let stageInterval;

    const createAttempt = async () => {
      try {
        // Progress through stages
        stageInterval = setInterval(() => {
          setStage(prev => Math.min(prev + 1, stages.length - 1));
        }, 800);

        // Validate bank coverage for each section
        const sections = await base44.entities.ExamSection.list('sort_order');
        const questionsPerSection = examConfig.questions_per_section || 20;
        
        for (const section of sections) {
          const sectionQuestions = await base44.entities.ExamQuestion.filter({
            exam_section_id: section.id,
            published_flag: true
          });
          
          if (sectionQuestions.length < questionsPerSection) {
            throw new Error(`Exam not available yet, missing questions in ${section.name}. Need ${questionsPerSection}, have ${sectionQuestions.length}.`);
          }
        }
        
        // Create attempt
        const attempt = await base44.entities.ExamAttempt.create({
          student_user_id: user.id,
          cohort_id: membership.cohort_id,
          exam_id: examConfig.id,
          started_at: new Date().toISOString(),
          current_question_index: 1,
        });
        
        // Randomly select questions for each section
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
        
        // Clear interval and redirect
        clearInterval(stageInterval);
        setTimeout(() => {
          window.location.href = createPageUrl(`StudentCertificationAttempt?id=${attempt.id}`);
        }, 1000);
      } catch (error) {
        clearInterval(stageInterval);
        console.error('Error creating exam attempt:', error);
        setError(error.message);
      }
    };

    createAttempt();

    return () => {
      if (stageInterval) clearInterval(stageInterval);
    };
  }, [user?.id, membership?.cohort_id, examConfig?.id]);

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
            onClick={() => window.location.href = createPageUrl('StudentCertification')}
            className="w-full bg-violet-600 hover:bg-violet-700"
          >
            Back to Certification
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