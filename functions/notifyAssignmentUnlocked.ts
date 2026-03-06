import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Scheduled hourly automation - checks which assignments unlock today (Saturday noon)
 * and sends in-app notifications to all enrolled students.
 *
 * Also checks for upcoming deadlines (due in 24h) for reminder notifications.
 * Also sends Week 8 unlock notifications (exam, project, portfolio).
 */

function getAssignmentDates(cohortStartDate, weekNumber) {
  const start = new Date(cohortStartDate);
  start.setHours(0, 0, 0, 0);
  const dayOfWeek = start.getDay();
  const daysUntilSaturday = dayOfWeek === 6 ? 0 : (6 - dayOfWeek);

  const firstSaturday = new Date(start);
  firstSaturday.setDate(start.getDate() + daysUntilSaturday);

  const unlockDate = new Date(firstSaturday);
  unlockDate.setDate(firstSaturday.getDate() + (weekNumber - 1) * 7);
  unlockDate.setHours(12, 0, 0, 0);

  const dueDate = new Date(unlockDate);
  dueDate.setDate(unlockDate.getDate() + 6);
  dueDate.setHours(22, 0, 0, 0);

  return { unlockDate, dueDate };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Get all active cohorts
    const cohorts = await db.entities.Cohort.filter({ status: 'active' });
    const templates = await db.entities.AssignmentTemplate.list('week_number');

    let totalNotifications = 0;
    let totalPenalties = 0;

    for (const cohort of cohorts) {
      if (!cohort.start_date) continue;

      // Get all active members
      const memberships = await db.entities.CohortMembership.filter({ cohort_id: cohort.id, status: 'active' });
      if (!memberships.length) continue;

      const studentIds = memberships.map(m => m.user_id);
      const cohortTemplates = templates.filter(t => t.status === 'published');

      for (const template of cohortTemplates) {
        const { unlockDate, dueDate } = getAssignmentDates(cohort.start_date, template.week_number);

        // Check if unlocking today (within this hour window)
        const unlockToday = unlockDate.toISOString().split('T')[0] === todayStr;
        const unlockHour = unlockDate.getHours();
        const currentHour = now.getHours();
        const isUnlockHour = unlockToday && Math.abs(currentHour - unlockHour) <= 1;

        // Check if due in ~24h
        const isDueSoon = dueDate > now && dueDate <= in24h;

        // Check if due date just passed (within this hour window)
        const dueDateStr = dueDate.toISOString().split('T')[0];
        const isDueHour = dueDateStr === todayStr && Math.abs(currentHour - dueDate.getHours()) <= 1 && now >= dueDate;

        for (const studentId of studentIds) {
          if (isUnlockHour) {
            const dupeKey = `unlock_${template.id}_${cohort.id}_${todayStr}`;
            const existing = await db.entities.Notification.filter({
              user_id: studentId,
              related_entity_id: dupeKey,
            });
            if (existing.length === 0) {
              if (template.week_number === 8) {
                await db.entities.Notification.create({
                  user_id: studentId,
                  type: 'exam_unlocked',
                  title: `🎓 Week 8 Unlocked — Exam, Project & Portfolio`,
                  message: `Congratulations on reaching Week 8! Your Final Quiz, Project, and Portfolio are now unlocked. Good luck!`,
                  link_url: `/StudentDashboard`,
                  related_entity_id: dupeKey,
                });
              } else {
                await db.entities.Notification.create({
                  user_id: studentId,
                  type: 'assignment_unlocked',
                  title: `📖 Week ${template.week_number} Assignment Unlocked`,
                  message: `"${template.title}" is now available. Due Friday at 10:00pm. Submit on time for bonus points!`,
                  link_url: `/StudentAssignments`,
                  related_entity_id: dupeKey,
                });
              }
              totalNotifications++;
            }
          }

          if (isDueSoon) {
            const reminderKey = `deadline_${template.id}_${cohort.id}_${todayStr}`;
            const existing = await db.entities.Notification.filter({
              user_id: studentId,
              related_entity_id: reminderKey,
            });
            if (existing.length === 0) {
              await db.entities.Notification.create({
                user_id: studentId,
                type: 'deadline_reminder',
                title: `⏰ Due in 24h — Week ${template.week_number}`,
                message: `"${template.title}" is due tomorrow at 10:00pm. Don't miss it!`,
                link_url: `/StudentAssignments`,
                related_entity_id: reminderKey,
              });
              totalNotifications++;
            }
          }

          // Auto-deduct points when due date passes for students who haven't submitted
          if (isDueHour) {
            const penaltyKey = `missed_deadline_${template.id}_${cohort.id}`;
            const existingPenalty = await db.entities.PointsLedger.filter({
              user_id: studentId,
              source_type: 'assignment',
              source_id: penaltyKey,
            });
            if (existingPenalty.length > 0) continue; // already penalised

            // Check if student submitted this assignment
            const submissions = await db.entities.Submission.filter({
              user_id: studentId,
              assignment_template_id: template.id,
            });
            const hasSubmitted = submissions.some(s => s.status !== 'draft');
            if (hasSubmitted) continue; // submitted — no penalty

            // No submission found — deduct points
            await db.entities.PointsLedger.create({
              user_id: studentId,
              points: -15,
              reason: 'assignment_missed_deadline',
              source_type: 'assignment',
              source_id: penaltyKey,
              awarded_by: 'system',
            });

            await db.entities.Notification.create({
              user_id: studentId,
              type: 'deadline_reminder',
              title: `⚠️ Missed Deadline — Week ${template.week_number}`,
              message: `You missed the deadline for "${template.title}". -15 points deducted.`,
              link_url: `/StudentAssignments`,
              related_entity_id: penaltyKey,
            });

            totalPenalties++;
          }
        }
      }
    }

    return Response.json({ success: true, totalNotifications, totalPenalties });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});