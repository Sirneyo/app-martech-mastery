import { useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

export async function checkAndHandleExpiry(attempt, examConfig, attemptQuestions, allQuestions) {
  if (!attempt || attempt.attempt_status !== 'in_progress' || attempt.submitted_at) {
    return null;
  }

  if (!attempt.expires_at) return null;

  const now = new Date();
  const expiresAt = new Date(attempt.expires_at);

  if (now >= expiresAt) {
    // Auto-submit expired attempt
    const existingAnswers = await base44.entities.ExamAnswer.filter({ attempt_id: attempt.id });
    const totalQuestions = examConfig?.total_questions || 80;
    let correctCount = 0;

    // Score existing answers
    for (const attemptQ of attemptQuestions) {
      const question = allQuestions.find(q => q.id === attemptQ.question_id);
      const answer = existingAnswers.find(a => a.question_id === attemptQ.question_id);
      
      if (!question) continue;

      if (answer) {
        const correctAnswer = JSON.parse(question.correct_answer_json);
        const studentAnswer = JSON.parse(answer.answer_json);
        
        const studentKeys = studentAnswer.keys.sort();
        const correctKeys = correctAnswer.keys.sort();
        
        const isCorrect = JSON.stringify(studentKeys) === JSON.stringify(correctKeys);
        
        if (isCorrect) correctCount++;

        await base44.entities.ExamAnswer.update(answer.id, {
          is_correct: isCorrect,
          points_earned: isCorrect ? 1 : 0,
        });
      }
      // Unanswered questions count as incorrect (no action needed)
    }

    // Calculate final score
    const scorePercent = Math.round((correctCount / totalQuestions) * 100);
    const passCorrectRequired = examConfig?.pass_correct_required || 65;
    const passFlag = correctCount >= passCorrectRequired;

    // Update attempt
    await base44.entities.ExamAttempt.update(attempt.id, {
      attempt_status: 'submitted',
      submitted_at: now.toISOString(),
      score_percent: scorePercent,
      pass_flag: passFlag,
    });

    // If passed, handle certificate, portfolio, and points
    if (passFlag) {
      const existingCerts = await base44.entities.Certificate.filter({
        student_user_id: attempt.student_user_id,
        cohort_id: attempt.cohort_id,
      });

      if (existingCerts.length === 0) {
        await base44.entities.Certificate.create({
          cohort_id: attempt.cohort_id,
          student_user_id: attempt.student_user_id,
          issued_at: now.toISOString(),
          certificate_id_code: `MM-${attempt.cohort_id.slice(-6)}-${attempt.id.slice(-6)}`,
        });
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

      const existingPoints = await base44.entities.PointsLedger.filter({
        user_id: attempt.student_user_id,
        source_type: 'exam',
        source_id: attempt.id,
      });

      if (existingPoints.length === 0) {
        await base44.entities.PointsLedger.create({
          user_id: attempt.student_user_id,
          points: 100,
          reason: 'exam_passed',
          source_type: 'exam',
          source_id: attempt.id,
        });
      }
    }

    return { expired: true, attemptId: attempt.id };
  }

  return null;
}

export function useExamExpiryGuard(attempt, examConfig, attemptQuestions, allQuestions) {
  useEffect(() => {
    if (!attempt) return;

    const checkExpiry = async () => {
      const result = await checkAndHandleExpiry(attempt, examConfig, attemptQuestions, allQuestions);
      if (result?.expired) {
        window.location.href = createPageUrl(`StudentCertificationResults?id=${result.attemptId}`);
      }
    };

    checkExpiry();
  }, [attempt?.id, attempt?.expires_at]);
}