import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Entity automation handler - triggered when QuizResult records are created.
 * Weekly quiz (week 1-7): 1st +75, 2nd +50, 3rd +25
 * Final quiz (week 8):    1st +400, 2nd +200, 3rd +100
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;
    const db = base44.asServiceRole;

    if (!data) return Response.json({ skipped: 'no data' });

    const { week_number, first_place_user_id, second_place_user_id, third_place_user_id } = data;
    const quizResultId = event.entity_id;

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
      const sourceId = `quiz_${quizResultId}_${pos.position}`;
      const existing = await db.entities.PointsLedger.filter({
        user_id: pos.user_id,
        source_type: 'achievement',
        source_id: sourceId,
      });
      if (existing.length > 0) continue;

      await db.entities.PointsLedger.create({
        user_id: pos.user_id,
        points: pos.points,
        reason: `quiz_${isFinalQuiz ? 'final' : 'weekly'}_${pos.position}_place${week_number ? `_week${week_number}` : ''}`,
        source_type: 'achievement',
        source_id: sourceId,
        awarded_by: 'system',
      });
      awarded.push({ user_id: pos.user_id, position: pos.position, points: pos.points });

      // In-app notification for quiz placement
      const medals = { first: '🥇', second: '🥈', third: '🥉' };
      const ordinals = { first: '1st', second: '2nd', third: '3rd' };
      const quizLabel = isFinalQuiz ? 'Final Quiz (Week 8)' : `Week ${week_number} Quiz`;
      await db.entities.Notification.create({
        user_id: pos.user_id,
        type: 'achievement',
        title: `${medals[pos.position]} You placed ${ordinals[pos.position]} in the ${quizLabel}!`,
        message: `Congratulations! You finished ${ordinals[pos.position]} and earned +${pos.points} points. Keep it up!`,
        link_url: `/StudentDashboard`,
        related_entity_id: sourceId,
      });
    }

    return Response.json({ awarded });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});