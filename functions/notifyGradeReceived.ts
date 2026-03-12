import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Resend } from 'npm:resend@4.0.0';

/**
 * Entity automation - fires when SubmissionGrade is created.
 * 1. Sends an email to the student
 * 2. Creates an in-app notification for the student
 * Works for both assignment AND project submissions.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data } = payload;
    const db = base44.asServiceRole;

    if (!data || event.type !== 'create') return Response.json({ skipped: 'not a create event' });

    const { submission_id, rubric_grade, feedback_text, feedback_url, score, max_score } = data;

    // Get submission
    const submissions = await db.entities.Submission.filter({ id: submission_id });
    if (!submissions.length) return Response.json({ skipped: 'submission not found' });
    const submission = submissions[0];

    const studentId = submission.user_id;

    // Get student user - use filter to avoid 404 crash
    const studentArr = await db.entities.User.filter({ id: studentId });
    if (!studentArr.length) return Response.json({ skipped: 'student not found' });
    const student = studentArr[0];

    // Get template title (assignment or project)
    let itemTitle = 'your submission';
    let reviewUrl = '/StudentAssignments';

    if (submission.submission_kind === 'assignment' && submission.assignment_template_id) {
      const templates = await db.entities.AssignmentTemplate.filter({ id: submission.assignment_template_id });
      if (templates.length) itemTitle = templates[0].title;
      reviewUrl = '/StudentAssignments';
    } else if (submission.submission_kind === 'project' && submission.project_template_id) {
      const templates = await db.entities.ProjectTemplate.filter({ id: submission.project_template_id });
      if (templates.length) itemTitle = templates[0].title;
      reviewUrl = '/StudentProjects';
    }

    const getFirstName = (user) => {
      const name = user.display_name || user.full_name || '';
      return name.split(' ')[0] || 'there';
    };

    const gradeEmojis = { Excellent: '🌟', Good: '✅', Fair: '📝', Poor: '⚠️' };
    const emoji = gradeEmojis[rubric_grade] || '📝';
    const appUrl = 'https://app.martech-mastery.com';
    const kindLabel = submission.submission_kind === 'project' ? 'Project' : 'Assignment';

    // 1. Send email to student
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey && student.email) {
      const resend = new Resend(resendKey);
      const emailResult = await resend.emails.send({
        from: 'MarTech Mastery <support@app.martech-mastery.com>',
        to: student.email,
        subject: `Your ${kindLabel} has been graded — log in to see your results`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(30,45,90,0.10);">
            <div style="background: #9dc6f0; padding: 32px 40px; text-align: center;">
              <img src="https://res.cloudinary.com/dbckozv27/image/upload/v1773184292/Full_logo_w5hurk.png" alt="MarTech Mastery" style="max-width: 150px; height: auto; display: block; margin: 0 auto;" />
            </div>
            <div style="padding: 40px 40px 32px;">
            <h2 style="color:#1e293b; margin-bottom: 8px;">${kindLabel} Graded ${emoji}</h2>
            <p style="color:#475569;">Hi ${student.full_name || 'there'},</p>
            <p style="color:#475569;">Your submission for <strong>${itemTitle}</strong> has been reviewed and graded by your tutor.</p>
            <p style="color:#475569;">Log in to your dashboard to see your grade and feedback.</p>
            <a href="${appUrl}${reviewUrl}" style="display:inline-block; background:#7c3aed; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600; margin-top:8px;">
              View My Results →
            </a>
            <p style="color:#94a3b8; font-size:12px; margin-top:24px;">MarTech Mastery Matrix Program</p>
            </div>
            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px; text-align: center;">
              <p style="color: #cbd5e1; font-size: 11px; margin: 0;">© MarTech Mastery by OAD Solutions</p>
            </div>
          </div>
        `
      });
      console.log('Email sent to student:', JSON.stringify(emailResult));
    }

    // 2. Create in-app notification for student
    await db.entities.Notification.create({
      user_id: studentId,
      type: 'assignment_graded',
      title: `${emoji} ${kindLabel} Graded: ${rubric_grade}`,
      message: `Your submission for "${itemTitle}" received a ${rubric_grade} grade.${feedback_text ? ' Tap to view feedback.' : ''}`,
      link_url: reviewUrl,
      related_entity_id: submission_id,
    });

    return Response.json({ success: true, student: student.email, grade: rubric_grade });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});