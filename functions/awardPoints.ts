import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Points Matrix:
 * Attendance:        Present +10, Absent -10, Late 0
 * Weekly Quiz (wk 1-7): 1st +75, 2nd +50, 3rd +25
 * Final Quiz (wk 8):    1st +400, 2nd +200, 3rd +100
 * Assignment grade:  Poor 0, Fair +25, Good +50, Excellent +100
 * Login streak:      7-day +10, 3-day absence -15
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { event_type, data } = payload;

    const db = base44.asServiceRole;

    if (event_type === 'attendance') {
      // data: { student_user_id, cohort_id, date, status, record_id }
      const { student_user_id, cohort_id, date, status, record_id } = data;

      let points = 0;
      if (status === 'present') points = 10;
      else if (status === 'absent') points = -10;
      else return Response.json({ awarded: 0, reason: 'late - no points' });

      // Idempotency: check if we already awarded for this record
      const existing = await db.entities.PointsLedger.filter({
        user_id: student_user_id,
        source_type: 'attendance',
        source_id: record_id,
      });
      if (existing.length > 0) {
        return Response.json({ awarded: 0, reason: 'already awarded' });
      }

      await db.entities.PointsLedger.create({
        user_id: student_user_id,
        points,
        reason: `attendance_${status}_${date}`,
        source_type: 'attendance',
        source_id: record_id,
        awarded_by: user.id,
      });

      return Response.json({ awarded: points, status });
    }

    if (event_type === 'quiz') {
      // data: { quiz_result_id, cohort_id, week_number, first_place_user_id, second_place_user_id, third_place_user_id }
      const { quiz_result_id, week_number, first_place_user_id, second_place_user_id, third_place_user_id } = data;

      const isFinalQuiz = week_number === 8;
      const prizes = isFinalQuiz
        ? { first: 400, second: 200, third: 100 }
        : { first: 75, second: 50, third: 25 };

      const positions = [
        { user_id: first_place_user_id, position: 'first', points: prizes.first },
        { user_id: second_place_user_id, position: 'second', points: prizes.second },
        { user_id: third_place_user_id, position: 'third', points: prizes.third },
      ].filter(p => !!p.user_id);

      const awarded = [];

      for (const pos of positions) {
        // Idempotency check
        const existing = await db.entities.PointsLedger.filter({
          user_id: pos.user_id,
          source_type: 'achievement',
          source_id: `quiz_${quiz_result_id}_${pos.position}`,
        });
        if (existing.length > 0) continue;

        await db.entities.PointsLedger.create({
          user_id: pos.user_id,
          points: pos.points,
          reason: `quiz_${isFinalQuiz ? 'final' : 'weekly'}_${pos.position}_place_week${week_number || ''}`,
          source_type: 'achievement',
          source_id: `quiz_${quiz_result_id}_${pos.position}`,
          awarded_by: user.id,
        });
        awarded.push({ user_id: pos.user_id, position: pos.position, points: pos.points });
      }

      return Response.json({ awarded });
    }

    if (event_type === 'assignment_grade') {
      // data: { submission_id, student_user_id, rubric_grade, grade_id }
      const { submission_id, student_user_id, rubric_grade, grade_id } = data;

      const gradePoints = { Poor: 0, Fair: 25, Good: 50, Excellent: 100 };
      const points = gradePoints[rubric_grade] ?? 0;

      if (points === 0) return Response.json({ awarded: 0, reason: 'Poor grade - no points' });

      const existing = await db.entities.PointsLedger.filter({
        user_id: student_user_id,
        source_type: 'assignment',
        source_id: grade_id,
      });
      if (existing.length > 0) return Response.json({ awarded: 0, reason: 'already awarded' });

      await db.entities.PointsLedger.create({
        user_id: student_user_id,
        points,
        reason: `assignment_grade_${rubric_grade.toLowerCase()}`,
        source_type: 'assignment',
        source_id: grade_id,
        awarded_by: user.id,
      });

      return Response.json({ awarded: points, rubric_grade });
    }

    if (event_type === 'login_streak') {
      // data: { user_id }
      const { user_id } = data;

      const loginEvents = await db.entities.LoginEvent.filter({ user_id });
      const dates = [...new Set(loginEvents.map(e => e.login_time.split('T')[0]))].sort().reverse();

      // Calculate current streak
      let streakCount = 0;
      for (let i = 0; i < dates.length; i++) {
        const expected = new Date();
        expected.setDate(expected.getDate() - i);
        const expectedStr = expected.toISOString().split('T')[0];
        if (dates[i] === expectedStr) {
          streakCount++;
        } else {
          break;
        }
      }

      const today = new Date().toISOString().split('T')[0];

      // Check for 7-day streak bonus
      if (streakCount === 7) {
        const existingBonus = await db.entities.PointsLedger.filter({
          user_id,
          source_type: 'bonus',
          source_id: `streak_7_${today}`,
        });
        if (existingBonus.length === 0) {
          await db.entities.PointsLedger.create({
            user_id,
            points: 10,
            reason: '7_day_login_streak_bonus',
            source_type: 'bonus',
            source_id: `streak_7_${today}`,
            awarded_by: 'system',
          });
          return Response.json({ awarded: 10, reason: '7-day streak bonus' });
        }
      }

      // Check for 3-day absence penalty
      if (dates.length > 0) {
        const lastLoginDate = new Date(dates[0]);
        const now = new Date();
        const daysSinceLastLogin = Math.floor((now - lastLoginDate) / (1000 * 60 * 60 * 24));

        if (daysSinceLastLogin === 3) {
          const penaltyKey = `absence_penalty_${today}`;
          const existingPenalty = await db.entities.PointsLedger.filter({
            user_id,
            source_type: 'bonus',
            source_id: penaltyKey,
          });
          if (existingPenalty.length === 0) {
            await db.entities.PointsLedger.create({
              user_id,
              points: -15,
              reason: '3_day_absence_penalty',
              source_type: 'bonus',
              source_id: penaltyKey,
              awarded_by: 'system',
            });
            return Response.json({ awarded: -15, reason: '3-day absence penalty' });
          }
        }
      }

      return Response.json({ awarded: 0, reason: 'no streak milestone today' });
    }

    return Response.json({ error: 'Unknown event_type' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});