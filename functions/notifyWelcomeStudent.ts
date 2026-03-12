import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Resend } from 'npm:resend@4.0.0';

/**
 * Called directly from the completeInvitation flow after a student account is created.
 * Sends a welcome email with next steps + creates an in-app notification.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { student_user_id, student_name, student_email } = payload;
    const firstName = (student_name || '').split(' ')[0] || 'there';

    if (!student_user_id || !student_email) {
      return Response.json({ error: 'student_user_id and student_email are required' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const appUrl = 'https://app.martech-mastery.com';
    const resendKey = Deno.env.get('RESEND_API_KEY');

    // Send welcome email
    if (resendKey) {
      const resend = new Resend(resendKey);
      const emailResult = await resend.emails.send({
        from: 'MarTech Mastery <support@app.martech-mastery.com>',
        to: student_email,
        subject: `🎉 Welcome to MarTech Mastery Matrix!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(30,45,90,0.10);">
            <div style="background: #9dc6f0; padding: 32px 40px; text-align: center;">
              <img src="https://res.cloudinary.com/dbckozv27/image/upload/v1773184292/Full_logo_w5hurk.png" alt="MarTech Mastery" style="max-width: 150px; height: auto; display: block; margin: 0 auto;" />
            </div>
            <div style="padding: 40px 40px 32px;">
            <h1 style="color:#1e293b; margin-bottom: 8px;">Welcome, ${firstName}! 🎉</h1>
            <p style="color:#475569; font-size:16px; line-height:1.6;">
              Your MarTech Mastery Matrix account has been successfully created. You're all set to begin your certification journey!
            </p>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:20px; margin:20px 0;">
              <h3 style="color:#1e293b; margin-top:0;">Your next steps:</h3>
              <ol style="color:#475569; line-height:2; padding-left:20px;">
                <li>Log in to your dashboard</li>
                <li>Complete your student profile</li>
                <li>Check your Week 1 assignment (unlocks this Saturday at 12pm)</li>
                <li>Join the WhatsApp community</li>
              </ol>
            </div>
            <a href="${appUrl}" style="display:inline-block; background:#7c3aed; color:#fff; text-decoration:none; padding:14px 28px; border-radius:8px; font-weight:600; font-size:16px;">
              Go to Dashboard →
            </a>
            <p style="color:#94a3b8; font-size:12px; margin-top:32px;">
              MarTech Mastery Matrix Program · You're receiving this because you accepted an invitation.
            </p>
            </div>
            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px; text-align: center;">
              <p style="color: #cbd5e1; font-size: 11px; margin: 0;">© MarTech Mastery by OAD Solutions</p>
            </div>
          </div>
        `
      });
      console.log('Welcome email sent:', JSON.stringify(emailResult));
    }

    // Create welcome in-app notification
    await db.entities.Notification.create({
      user_id: student_user_id,
      type: 'welcome',
      title: `🎉 Welcome to MarTech Mastery Matrix!`,
      message: `Your account is all set. Check your first assignment which unlocks this Saturday at 12:00pm.`,
      link_url: `/StudentDashboard`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});