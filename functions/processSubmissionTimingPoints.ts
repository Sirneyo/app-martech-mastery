import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Resend } from 'npm:resend@4.0.0';

/**
 * Entity automation - triggered when a Submission is created/updated with status='submitted'.
 * Awards +10 if submitted before due date, -15 if submitted past due date.
 * Also sends email to student confirming submission, emails tutors, and creates in-app notifications for tutors.
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
    const payload = await req.json();
    const { event, data, old_data } = payload;
    const db = base44.asServiceRole;

    if (!data) return Response.json({ skipped: 'no data' });
    if (data.submission_kind !== 'assignment') return Response.json({ skipped: 'not an assignment' });
    if (data.status !== 'submitted') return Response.json({ skipped: 'not submitted' });

    // Skip if status hasn't changed to 'submitted'
    if (event.type === 'update' && old_data?.status === 'submitted') {
      return Response.json({ skipped: 'already submitted before' });
    }

    const submissionId = event.entity_id;
    const studentId = data.user_id;
    const cohortId = data.cohort_id;
    const submittedAt = data.submitted_date ? new Date(data.submitted_date) : new Date();

    if (!data.assignment_template_id) return Response.json({ skipped: 'no assignment template id' });

    // Fetch all needed data — use filter instead of get to avoid 404 throws
    const [templates, cohorts, studentArr] = await Promise.all([
      db.entities.AssignmentTemplate.filter({ id: data.assignment_template_id }),
      cohortId ? db.entities.Cohort.filter({ id: cohortId }) : Promise.resolve([]),
      db.entities.User.filter({ id: studentId }),
    ]);

    if (templates.length === 0) return Response.json({ skipped: 'template not found' });
    const template = templates[0];
    const weekNumber = template.week_number;
    const student = studentArr[0] || null;

    // --- Points logic ---
    let points = null;
    let isOnTime = null;

    if (weekNumber && cohortId && cohorts.length > 0) {
      const cohort = cohorts[0];
      const { dueDate } = getAssignmentDates(cohort.start_date, weekNumber);
      isOnTime = submittedAt <= dueDate;

      // Only award +10 for on-time submissions.
      // Late penalty (-15) is handled automatically at deadline by the notifyAssignmentUnlocked scheduler.
      if (isOnTime) {
        points = 10;
        const existing = await db.entities.PointsLedger.filter({
          user_id: studentId,
          source_type: 'assignment',
          source_id: `submission_timing_${submissionId}`,
        });

        if (existing.length === 0) {
          await db.entities.PointsLedger.create({
            user_id: studentId,
            points,
            reason: 'assignment_submitted_on_time',
            source_type: 'assignment',
            source_id: `submission_timing_${submissionId}`,
            awarded_by: 'system',
          });
        }
      }
    }

    // --- Tutor notifications & emails ---
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com';
    const cohortName = cohorts.length > 0 ? cohorts[0].name : 'Unknown Cohort';
    const submittedStr = submittedAt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

    // Get tutors for this cohort
    let tutors = [];
    if (cohortId) {
      const tutorAssignments = await db.entities.TutorCohortAssignment.filter({ cohort_id: cohortId });
      if (tutorAssignments.length > 0) {
        const tutorIdList = tutorAssignments.map(t => t.tutor_id);
        const allTutorResults = await Promise.all(
          tutorIdList.map(id => db.entities.User.filter({ id }))
        );
        tutors = allTutorResults.map(r => r[0]).filter(Boolean);
      }
    }

    const notifTitle = `📥 New Assignment Submission`;
    const notifMessage = `${student?.full_name || 'A student'} submitted "${template.title}" (${cohortName})`;

    // Create in-app notifications + send emails for each tutor
    const tutorTasks = tutors.map(async (tutor) => {
      // In-app notification
      await db.entities.Notification.create({
        user_id: tutor.id,
        type: 'assignment_published',
        title: notifTitle,
        message: notifMessage,
        link_url: '/TutorAssignmentSubmissions',
        related_entity_id: submissionId,
      });

      // Email notification
      if (resendKey && tutor.email) {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: 'MarTech Mastery <noreply@martech-mastery.com>',
          to: tutor.email,
          subject: `📥 New Assignment Submission — ${template.title}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
              <h2 style="color:#1e293b; margin-bottom: 8px;">New Submission to Review 📥</h2>
              <p style="color:#475569;">Hi ${tutor.full_name || 'there'},</p>
              <p style="color:#475569;">A student has submitted an assignment that needs your review.</p>
              <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:20px; margin:20px 0;">
                <p style="margin:0 0 8px; color:#64748b; font-size:13px;">SUBMISSION DETAILS</p>
                <p style="margin:0; color:#1e293b;"><strong>Student:</strong> ${student?.full_name || 'Unknown'}</p>
                <p style="margin:8px 0 0; color:#1e293b;"><strong>Assignment:</strong> ${template.title}</p>
                <p style="margin:8px 0 0; color:#1e293b;"><strong>Cohort:</strong> ${cohortName}</p>
                <p style="margin:8px 0 0; color:#1e293b;"><strong>Submitted:</strong> ${submittedStr}</p>
              </div>
              <a href="${appUrl}/TutorAssignmentSubmissions" style="display:inline-block; background:#7c3aed; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600; margin-top:8px;">
                Review Submission →
              </a>
              <p style="color:#94a3b8; font-size:12px; margin-top:24px;">MarTech Mastery Matrix Program</p>
            </div>
          `
        });
      }
    });

    // Student confirmation email
    const studentTasks = [];
    if (resendKey && student?.email) {
      const resend = new Resend(resendKey);
      const pointsHtml = points !== null
        ? `<p style="margin:8px 0 0; color:#1e293b;"><strong>Points:</strong> <span style="color:${isOnTime ? '#16a34a' : '#dc2626'}">${isOnTime ? `+${points}` : points} points</span></p>`
        : '';
      const statusHtml = isOnTime !== null
        ? `<p style="margin:8px 0 0; color:#1e293b;"><strong>Status:</strong> <span style="color:${isOnTime ? '#16a34a' : '#dc2626'}">${isOnTime ? '⏰ On time' : '⚠️ Late'}</span></p>`
        : '';

      studentTasks.push(resend.emails.send({
        from: 'MarTech Mastery <noreply@martech-mastery.com>',
        to: student.email,
        subject: `✅ Assignment Submitted — ${template.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
            <h2 style="color:#1e293b; margin-bottom: 8px;">Submission Confirmed ✅</h2>
            <p style="color:#475569;">Hi ${student.full_name || 'there'},</p>
            <p style="color:#475569;">We've received your submission for <strong>${template.title}</strong>.</p>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:20px; margin:20px 0;">
              <p style="margin:0 0 8px; color:#64748b; font-size:13px;">SUBMISSION DETAILS</p>
              <p style="margin:0; color:#1e293b;"><strong>Assignment:</strong> ${template.title}</p>
              <p style="margin:8px 0 0; color:#1e293b;"><strong>Submitted:</strong> ${submittedStr}</p>
              ${statusHtml}
              ${pointsHtml}
            </div>
            <p style="color:#475569; font-size:14px;">Your tutor will review your submission and provide feedback shortly.</p>
            <a href="${appUrl}/StudentAssignments" style="display:inline-block; background:#7c3aed; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600; margin-top:8px;">
              View My Assignments →
            </a>
            <p style="color:#94a3b8; font-size:12px; margin-top:24px;">MarTech Mastery Matrix Program</p>
          </div>
        `
      }));
    }

    await Promise.all([...tutorTasks, ...studentTasks]);

    return Response.json({ success: true, points, isOnTime, tutors_notified: tutors.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});