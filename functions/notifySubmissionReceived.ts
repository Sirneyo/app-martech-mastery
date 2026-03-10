import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Resend } from 'npm:resend@4.0.0';

/**
 * Entity automation - fires when a Submission is created or updated.
 * Sends email to:
 *  1. Student — confirmation their submission was received
 *  2. Assigned tutors for that cohort — alert to review
 * Only fires when status transitions to "submitted".
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload;
    const db = base44.asServiceRole;

    if (!data) return Response.json({ skipped: 'no data' });

    // Only fire when status becomes "submitted"
    const isNowSubmitted = data.status === 'submitted';
    const wasAlreadySubmitted = old_data?.status === 'submitted';
    if (!isNowSubmitted || wasAlreadySubmitted) {
      return Response.json({ skipped: 'not a new submission event' });
    }

    const { user_id, submission_kind, assignment_template_id, project_template_id, cohort_id } = data;

    // Get student
    const studentArr = await db.entities.User.filter({ id: user_id });
    if (!studentArr.length) return Response.json({ skipped: 'student not found' });
    const student = studentArr[0];

    // Get template title
    let itemTitle = 'your submission';
    let reviewUrl = submission_kind === 'project' ? '/TutorProjectSubmissions' : '/TutorAssignmentSubmissions';
    const kindLabel = submission_kind === 'project' ? 'Project' : 'Assignment';

    if (submission_kind === 'assignment' && assignment_template_id) {
      const templates = await db.entities.AssignmentTemplate.filter({ id: assignment_template_id });
      if (templates.length) itemTitle = templates[0].title;
    } else if (submission_kind === 'project' && project_template_id) {
      const templates = await db.entities.ProjectTemplate.filter({ id: project_template_id });
      if (templates.length) itemTitle = templates[0].title;
    }

    const appUrl = 'https://app.martech-mastery.com';
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const resend = resendKey ? new Resend(resendKey) : null;

    // ─────────────────────────────────────────────────────────────
    // 1. Email student — confirmation
    // ─────────────────────────────────────────────────────────────
    if (resend && student.email) {
      await resend.emails.send({
        from: 'MarTech Mastery <support@app.martech-mastery.com>',
        to: student.email,
        subject: `✅ ${kindLabel} Submitted — ${itemTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(30,45,90,0.10);">
            <div style="background: #9dc6f0; padding: 32px 40px; text-align: center;">
              <img src="https://res.cloudinary.com/dbckozv27/image/upload/v1773184292/Full_logo_w5hurk.png" alt="MarTech Mastery" style="max-width: 150px; height: auto; display: block; margin: 0 auto;" />
            </div>
            <div style="padding: 40px 40px 32px;">
              <h2 style="color: #1a2d5a; font-size: 22px; margin: 0 0 8px;">Submission Received ✅</h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Hi ${student.full_name || 'there'},</p>
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                Your <strong>${kindLabel.toLowerCase()}</strong> for <strong>${itemTitle}</strong> has been successfully submitted and is now in the review queue. Your tutor will grade it shortly.
              </p>
              <a href="${appUrl}${submission_kind === 'project' ? '/StudentProjects' : '/StudentAssignments'}" style="display: inline-block; background: #e8620a; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px;">
                View My Submissions →
              </a>
            </div>
            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">You'll receive another email once your submission has been graded.</p>
              <p style="color: #cbd5e1; font-size: 11px; margin: 8px 0 0;">© MarTech Mastery by OAD Solutions</p>
            </div>
          </div>
        `
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Email tutors assigned to this cohort
    // ─────────────────────────────────────────────────────────────
    if (cohort_id && resend) {
      const tutorAssignments = await db.entities.TutorCohortAssignment.filter({ cohort_id });
      if (tutorAssignments.length) {
        const tutorIds = tutorAssignments.map(ta => ta.tutor_id);
        const allUsers = await db.entities.User.list('-created_date', 500);
        const tutors = allUsers.filter(u => tutorIds.includes(u.id) && u.email);

        await Promise.all(tutors.map(tutor =>
          resend.emails.send({
            from: 'MarTech Mastery <support@app.martech-mastery.com>',
            to: tutor.email,
            subject: `📥 New ${kindLabel} Submission — ${student.full_name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(30,45,90,0.10);">
                <div style="background: #9dc6f0; padding: 32px 40px; text-align: center;">
                  <img src="https://res.cloudinary.com/dbckozv27/image/upload/v1773184292/Full_logo_w5hurk.png" alt="MarTech Mastery" style="max-width: 150px; height: auto; display: block; margin: 0 auto;" />
                </div>
                <div style="padding: 40px 40px 32px;">
                  <h2 style="color: #1a2d5a; font-size: 22px; margin: 0 0 8px;">New ${kindLabel} to Review 📥</h2>
                  <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Hi ${tutor.full_name || 'there'},</p>
                  <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
                    <strong>${student.full_name}</strong> has submitted their ${kindLabel.toLowerCase()} and it is ready for review.
                  </p>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Submission Details</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
                      <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px; width: 100px;">Student:</td><td style="padding: 6px 0; color: #1a2d5a; font-size: 14px; font-weight: 600;">${student.full_name}</td></tr>
                      <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;">${kindLabel}:</td><td style="padding: 6px 0; color: #1a2d5a; font-size: 14px; font-weight: 600;">${itemTitle}</td></tr>
                      <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;">Type:</td><td style="padding: 6px 0; color: #1a2d5a; font-size: 14px; font-weight: 600;">${kindLabel}</td></tr>
                    </table>
                  </div>
                  <a href="${appUrl}${reviewUrl}" style="display: inline-block; background: #e8620a; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px;">
                    Review Submission →
                  </a>
                </div>
                <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px; text-align: center;">
                  <p style="color: #cbd5e1; font-size: 11px; margin: 0;">© MarTech Mastery by OAD Solutions</p>
                </div>
              </div>
            `
          })
        ));
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. In-app notification for student
    // ─────────────────────────────────────────────────────────────
    await db.entities.Notification.create({
      user_id,
      type: 'assignment_published',
      title: `${kindLabel} Submitted ✅`,
      message: `Your submission for "${itemTitle}" has been received and is awaiting review.`,
      link_url: submission_kind === 'project' ? '/StudentProjects' : '/StudentAssignments',
      related_entity_id: data.id,
    });

    return Response.json({ success: true, student: student.email, item: itemTitle });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});