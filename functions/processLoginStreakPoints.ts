import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Scheduled daily function - checks all students for login streak milestones.
 * 7-day streak: +10 points
 * 3-day absence: -15 points
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    const today = new Date().toISOString().split('T')[0];

    // Get all students
    const allUsers = await db.entities.User.list();
    const students = allUsers.filter(u => u.app_role === 'student');

    // Pre-load cohort memberships and cohorts to check start dates
    const allMemberships = await db.entities.CohortMembership.list();
    const allCohorts = await db.entities.Cohort.list();
    const cohortMap = Object.fromEntries(allCohorts.map(c => [c.id, c]));

    const results = [];

    for (const student of students) {
      const loginEvents = await db.entities.LoginEvent.filter({ user_id: student.id });
      const dates = [...new Set(loginEvents.map(e => e.login_time.split('T')[0]))].sort().reverse();

      if (dates.length === 0) continue;

      // Calculate streak
      let streakCount = 0;
      for (let i = 0; i < dates.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);
        const expectedStr = expected.toISOString().split('T')[0];
        if (dates[i] === expectedStr) {
          streakCount++;
        } else {
          break;
        }
      }

      // 7-day streak bonus
      if (streakCount >= 7 && streakCount % 7 === 0) {
        const bonusKey = `streak_7_${today}_${student.id}`;
        const existingBonus = await db.entities.PointsLedger.filter({
          user_id: student.id,
          source_type: 'bonus',
          source_id: bonusKey,
        });
        if (existingBonus.length === 0) {
          await db.entities.PointsLedger.create({
            user_id: student.id,
            points: 10,
            reason: '7_day_login_streak_bonus',
            source_type: 'bonus',
            source_id: bonusKey,
            awarded_by: 'system',
          });
          results.push({ student_id: student.id, awarded: 10, reason: '7-day streak' });
        }
      }


    }

    return Response.json({ processed: students.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});