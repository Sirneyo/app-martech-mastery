import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Resend } from 'npm:resend@4.0.0';

/**
 * Entity automation - fires when SubmissionGrade is created.
 * 1. Sends an email to the student
 * 2. Creates an in-app notification
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data } = payload;
    const db = base44.asServiceRole;

    if (!data || event.type !== 'create') return Response.json({ skipped: 'not a create event' });

    const { submission_id, rubric_grade, feedback_text } = data;

    // Get submission
    const submissions = await db.entities.Submission.filter({ id: submission_id });
    if (!submissions.length) return Response.json({ skipped: 'submission not found' });
    const submission = submissions[0];

    if (submission.submission_kind !== 'assignment') return Response.json({ skipped: 'not an assignment submission' });

    const studentId = submission.user_id;

    // Get student user
    const student = await db.entities.User.get(studentId);
    if (!student) return Response.json({ skipped: 'student not found' });

    // Get assignment title
    let assignmentTitle = 'your assignment';
    if (submission.assignment_template_id) {
      const templates = await db.entities.AssignmentTemplate.filter({ id: submission.assignment_template_id });
      if (templates.length) assignmentTitle = templates[0].title;
    }

    const gradeColors = { Excellent: '🌟', Good: '✅', Fair: '📝', Poor: '⚠️' };
    const emoji = gradeColors[rubric_grade] || '📝';
    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com';
    const loginUrl = `${appUrl}/StudentAssignments`;

    // 1. Send email
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey && student.email) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: 'MarTech Mastery <noreply@martech-mastery.com>',
        to: student.email,
        subject: `${emoji} Your assignment has been graded — ${rubric_grade}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
            <img src="https://martech-mastery.com/logo.png" alt="MarTech Mastery" style="height:40px; margin-bottom:24px;" onerror="this.style.display='none'" />
            <h2 style="color:#1e293b; margin-bottom: 8px;">Assignment Graded ${emoji}</h2>
            <p style="color:#475569;">Hi ${student.full_name || 'there'},</p>
            <p style="color:#475569;">Your submission for <strong>${assignmentTitle}</strong> has been reviewed.</p>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:20px; margin:20px 0;">
              <p style="margin:0; color:#64748b; font-size:14px;">Grade</p>
              <p style="margin:4px 0 0; font-size:24px; font-weight:700; color:#1e293b;">${emoji} ${rubric_grade}</p>
              ${feedback_text ? `<p style="margin:12px 0 0; color:#475569; font-size:14px;">${feedback_text}</p>` : ''}
            </div>
            <a href="${loginUrl}" style="display:inline-block; background:#7c3aed; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600; margin-top:8px;">
              View Full Feedback →
            </a>
            <p style="color:#94a3b8; font-size:12px; margin-top:24px;">MarTech Mastery Matrix Program</p>
          </div>
        `
      });
    }

    // 2. Create in-app notification
    await db.entities.Notification.create({
      user_id: studentId,
      type: 'assignment_graded',
      title: `${emoji} Assignment Graded: ${rubric_grade}`,
      message: `Your submission for "${assignmentTitle}" received a ${rubric_grade} grade.${feedback_text ? ' Tap to view feedback.' : ''}`,
      link_url: `/StudentAssignments`,
      related_entity_id: submission_id,
    });

    return Response.json({ success: true, student: student.email, grade: rubric_grade });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});