import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Entity automation handler - triggered when Attendance records are created/updated.
 * Awards +10 for present, -10 for absent, 0 for late.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;
    const db = base44.asServiceRole;

    if (!data) {
      return Response.json({ skipped: 'no data' });
    }

    const { student_user_id, cohort_id, date, status } = data;
    const recordId = event.entity_id;

    // Only award for present or absent
    let points = 0;
    if (status === 'present') points = 10;
    else if (status === 'absent') points = -10;
    else return Response.json({ skipped: `status '${status}' earns 0 points` });

    // If this is an update and status didn't change, skip
    if (event.type === 'update' && old_data?.status === status) {
      return Response.json({ skipped: 'status unchanged' });
    }

    // If update and old status also had points, reverse the old award first
    if (event.type === 'update' && old_data) {
      const oldPoints = old_data.status === 'present' ? 10 : old_data.status === 'absent' ? -10 : 0;
      if (oldPoints !== 0) {
        const oldEntries = await db.entities.PointsLedger.filter({
          user_id: student_user_id,
          source_type: 'attendance',
          source_id: recordId,
        });
        for (const entry of oldEntries) {
          await db.entities.PointsLedger.delete(entry.id);
        }
      }
    }

    // Idempotency for create: check if already awarded
    if (event.type === 'create') {
      const existing = await db.entities.PointsLedger.filter({
        user_id: student_user_id,
        source_type: 'attendance',
        source_id: recordId,
      });
      if (existing.length > 0) return Response.json({ skipped: 'already awarded' });
    }

    await db.entities.PointsLedger.create({
      user_id: student_user_id,
      points,
      reason: `attendance_${status}_${date}`,
      source_type: 'attendance',
      source_id: recordId,
      awarded_by: 'system',
    });

    return Response.json({ awarded: points, student_user_id, status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});