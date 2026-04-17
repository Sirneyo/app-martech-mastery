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

    // Helper: delete records sequentially to avoid rate limiting
    const deleteSequentially = async (records, deleteFn) => {
      for (const record of records) {
        await deleteFn(record.id);
      }
    };

    // 1. Fetch all data first
    const [points, submissions, portfolioItems, examAttempts] = await Promise.all([
      db.entities.PointsLedger.filter({ user_id: student_user_id }),
      db.entities.Submission.filter({ user_id: student_user_id }),
      db.entities.PortfolioItemStatus.filter({ user_id: student_user_id }),
      db.entities.ExamAttempt.filter({ student_user_id: student_user_id }),
    ]);

    const attemptIds = new Set(examAttempts.map(ea => ea.id));

    // 2. Fetch exam answers and attempt questions if there are attempts
    let answersToDelete = [];
    let aqToDelete = [];
    if (attemptIds.size > 0) {
      const [examAnswers, attemptQuestions] = await Promise.all([
        db.entities.ExamAnswer.filter({}),
        db.entities.ExamAttemptQuestion.filter({}),
      ]);
      answersToDelete = examAnswers.filter(a => attemptIds.has(a.attempt_id));
      aqToDelete = attemptQuestions.filter(aq => attemptIds.has(aq.attempt_id));
    }

    // 3. Delete all records sequentially to respect rate limits
    await deleteSequentially(points, id => db.entities.PointsLedger.delete(id));
    await deleteSequentially(submissions, id => db.entities.Submission.delete(id));
    await deleteSequentially(portfolioItems, id => db.entities.PortfolioItemStatus.delete(id));
    await deleteSequentially(answersToDelete, id => db.entities.ExamAnswer.delete(id));
    await deleteSequentially(aqToDelete, id => db.entities.ExamAttemptQuestion.delete(id));
    await deleteSequentially(examAttempts, id => db.entities.ExamAttempt.delete(id));

    // 4. Update the cohort membership to the new cohort
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

    // 5. Log the action
    await db.entities.AdminAuditLog.create({
      action: 'cohort_change_with_reset',
      admin_id: user.id,
      target_user_id: student_user_id,
      timestamp: new Date().toISOString(),
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