import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.app_role !== 'admin' && user.app_role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { student_user_id, new_cohort_id } = await req.json();
    if (!student_user_id || !new_cohort_id) {
      return Response.json({ error: 'Missing student_user_id or new_cohort_id' }, { status: 400 });
    }

    const db = base44.asServiceRole;

    // 1. Delete all points ledger entries for this student
    const points = await db.entities.PointsLedger.filter({ user_id: student_user_id });
    await Promise.all(points.map(p => db.entities.PointsLedger.delete(p.id)));

    // 2. Delete all submission records for this student
    const submissions = await db.entities.Submission.filter({ user_id: student_user_id });
    await Promise.all(submissions.map(s => db.entities.Submission.delete(s.id)));

    // 3. Delete all portfolio item statuses for this student
    const portfolioItems = await db.entities.PortfolioItemStatus.filter({ user_id: student_user_id });
    await Promise.all(portfolioItems.map(p => db.entities.PortfolioItemStatus.delete(p.id)));

    // 4. Delete all exam attempts for this student
    const examAttempts = await db.entities.ExamAttempt.filter({ student_user_id: student_user_id });
    await Promise.all(examAttempts.map(ea => db.entities.ExamAttempt.delete(ea.id)));

    // 5. Delete all exam answers for each attempt
    // (already cascaded logically since attempts are gone, but clean up explicitly)
    const examAnswers = await db.entities.ExamAnswer.filter({});
    // ExamAnswer doesn't have user_id directly — filter by attempt_id
    const attemptIds = new Set(examAttempts.map(ea => ea.id));
    const answersToDelete = examAnswers.filter(a => attemptIds.has(a.attempt_id));
    await Promise.all(answersToDelete.map(a => db.entities.ExamAnswer.delete(a.id)));

    // 6. Delete all ExamAttemptQuestions for those attempts
    const attemptQuestions = await db.entities.ExamAttemptQuestion.filter({});
    const aqToDelete = attemptQuestions.filter(aq => attemptIds.has(aq.attempt_id));
    await Promise.all(aqToDelete.map(aq => db.entities.ExamAttemptQuestion.delete(aq.id)));

    // 7. Update the cohort membership to the new cohort
    const memberships = await db.entities.CohortMembership.filter({ user_id: student_user_id });
    if (memberships.length > 0) {
      await db.entities.CohortMembership.update(memberships[0].id, {
        cohort_id: new_cohort_id,
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active',
      });
    } else {
      await db.entities.CohortMembership.create({
        user_id: student_user_id,
        cohort_id: new_cohort_id,
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active',
      });
    }

    // 8. Log the action
    await db.entities.AdminAuditLog.create({
      action: 'cohort_change_with_reset',
      performed_by: user.id,
      target_user_id: student_user_id,
      details: JSON.stringify({
        new_cohort_id,
        points_deleted: points.length,
        submissions_deleted: submissions.length,
        portfolio_items_deleted: portfolioItems.length,
        exam_attempts_deleted: examAttempts.length,
      }),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});