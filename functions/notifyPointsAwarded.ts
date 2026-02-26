import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Entity automation - fires when PointsLedger entry is created.
 * Creates an in-app notification for points earned or lost.
 * Skips daily_login (too frequent/noisy) and streak notifications 
 * (those get their own richer message).
 */

const SKIP_REASONS = ['daily_login'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data } = payload;
    const db = base44.asServiceRole;

    if (!data || event.type !== 'create') return Response.json({ skipped: 'not a create event' });

    const { user_id, points, reason } = data;

    if (SKIP_REASONS.includes(reason)) return Response.json({ skipped: 'skipped noisy reason' });

    const isStreak = reason === '7_day_login_streak_bonus';
    const isAbsence = reason === '3_day_absence_penalty';
    const isGain = points > 0;

    let title, message, type, link;

    if (isStreak) {
      title = `🔥 7-Day Login Streak!`;
      message = `You've logged in 7 days in a row! +${points} bonus points awarded.`;
      type = 'login_streak';
      link = `/StudentDashboard`;
    } else if (isAbsence) {
      title = `⚠️ Absence Penalty`;
      message = `You haven't logged in for 3 days. ${points} points deducted. Keep your streak alive!`;
      type = 'points_deducted';
      link = `/StudentDashboard`;
    } else if (reason.startsWith('attendance_present')) {
      title = `✅ +${points} Points — Attendance`;
      message = `You earned ${points} points for attending today's session.`;
      type = 'points_awarded';
      link = `/StudentDashboard`;
    } else if (reason.startsWith('attendance_absent')) {
      title = `⚠️ ${points} Points — Absence`;
      message = `${points} points deducted for missing today's session.`;
      type = 'points_deducted';
      link = `/StudentDashboard`;
    } else if (reason.startsWith('quiz_')) {
      const placeMatch = reason.match(/(first|second|third)_place/);
      const place = placeMatch ? placeMatch[1] : '';
      const medals = { first: '🥇', second: '🥈', third: '🥉' };
      title = `${medals[place] || '🏆'} +${points} Points — Quiz`;
      message = `You placed ${place} in the quiz! +${points} points awarded.`;
      type = 'achievement';
      link = `/StudentDashboard`;
    } else if (reason.startsWith('assignment_grade')) {
      title = `📝 +${points} Points — Assignment Grade`;
      message = `You earned ${points} points for your assignment quality.`;
      type = 'points_awarded';
      link = `/StudentAssignments`;
    } else if (reason === 'assignment_submitted_on_time') {
      title = `⏰ +${points} Points — On-Time Submission`;
      message = `Great job submitting on time! +${points} bonus points.`;
      type = 'points_awarded';
      link = `/StudentAssignments`;
    } else if (reason === 'assignment_submitted_late') {
      title = `⏰ ${points} Points — Late Submission`;
      message = `Your assignment was submitted after the deadline. ${points} points deducted.`;
      type = 'points_deducted';
      link = `/StudentAssignments`;
    } else {
      title = isGain ? `🌟 +${points} Points Earned` : `⚠️ ${points} Points Deducted`;
      message = `Your points balance has been updated by ${isGain ? '+' : ''}${points} points.`;
      type = isGain ? 'points_awarded' : 'points_deducted';
      link = `/StudentDashboard`;
    }

    await db.entities.Notification.create({
      user_id,
      type,
      title,
      message,
      link_url: link,
      related_entity_id: event.entity_id,
    });

    return Response.json({ success: true, user_id, points });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});