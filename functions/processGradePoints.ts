import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Entity automation handler - triggered when SubmissionGrade records are created/updated.
 * Poor: 0pts, Fair: +25pts, Good: +50pts, Excellent: +100pts
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;
    const db = base44.asServiceRole;

    if (!data) return Response.json({ skipped: 'no data' });

    const { submission_id, rubric_grade } = data;
    const gradeId = event.entity_id;

    const gradePoints = { Poor: 0, Fair: 25, Good: 50, Excellent: 100 };
    const points = gradePoints[rubric_grade] ?? 0;

    // Get the submission to find the student
    const submissions = await db.entities.Submission.filter({ id: submission_id });
    if (submissions.length === 0) return Response.json({ skipped: 'submission not found' });
    const submission = submissions[0];
    const studentId = submission.user_id;

    // If update and grade changed, reverse old points
    if (event.type === 'update' && old_data?.rubric_grade && old_data.rubric_grade !== rubric_grade) {
      const oldEntries = await db.entities.PointsLedger.filter({
        user_id: studentId,
        source_type: 'assignment',
        source_id: gradeId,
      });
      for (const entry of oldEntries) {
        await db.entities.PointsLedger.delete(entry.id);
      }
    }

    if (points === 0) return Response.json({ awarded: 0, reason: 'Poor grade - no points' });

    // Idempotency for create
    if (event.type === 'create') {
      const existing = await db.entities.PointsLedger.filter({
        user_id: studentId,
        source_type: 'assignment',
        source_id: gradeId,
      });
      if (existing.length > 0) return Response.json({ skipped: 'already awarded' });
    }

    await db.entities.PointsLedger.create({
      user_id: studentId,
      points,
      reason: `assignment_grade_${rubric_grade.toLowerCase()}`,
      source_type: 'assignment',
      source_id: gradeId,
      awarded_by: 'system',
    });

    return Response.json({ awarded: points, rubric_grade, student_user_id: studentId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});