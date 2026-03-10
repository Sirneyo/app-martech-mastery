import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Resend } from 'npm:resend@4.0.0';

/**
 * Entity automation - fires when PortfolioItemStatus is updated.
 * Creates an in-app notification + sends email for feedback / approval / revision.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload;
    const db = base44.asServiceRole;

    if (!data || event.type !== 'update') return Response.json({ skipped: 'not an update event' });

    const newStatus = data.status;
    const oldStatus = old_data?.status;

    if (newStatus === oldStatus) return Response.json({ skipped: 'status unchanged' });

    const relevantStatuses = ['approved', 'needs_revision'];
    if (!relevantStatuses.includes(newStatus)) return Response.json({ skipped: `status '${newStatus}' not notifiable` });

    const studentId = data.user_id;
    if (!studentId) return Response.json({ skipped: 'no user_id' });

    // Get student user
    const studentArr = await db.entities.User.filter({ id: studentId });
    const student = studentArr[0] || null;

    // Get portfolio item title
    let itemTitle = 'a portfolio item';
    if (data.portfolio_item_id) {
      try {
        const templates = await db.entities.PortfolioItemTemplate.filter({ id: data.portfolio_item_id });
        if (templates.length) itemTitle = templates[0].title;
      } catch (e) {
        // keep default
      }
    }

    const isApproved = newStatus === 'approved';
    const appUrl = 'https://app.martech-mastery.com';

    // 1. Send email to student
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey && student?.email) {
      const resend = new Resend(resendKey);
      const emailResult = await resend.emails.send({
        from: 'MarTech Mastery <support@app.martech-mastery.com>',
        to: student.email,
        subject: isApproved ? `✅ Portfolio Item Approved — ${itemTitle}` : `📝 Portfolio Revision Needed — ${itemTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(30,45,90,0.10);">
            <div style="background: #9dc6f0; padding: 32px 40px; text-align: center;">
              <img src="https://res.cloudinary.com/dbckozv27/image/upload/v1773184292/Full_logo_w5hurk.png" alt="MarTech Mastery" style="max-width: 150px; height: auto; display: block; margin: 0 auto;" />
            </div>
            <div style="padding: 40px 40px 32px;">
            <h2 style="color:#1e293b; margin-bottom: 8px;">${isApproved ? '✅ Portfolio Item Approved' : '📝 Revision Needed'}</h2>
            <p style="color:#475569;">Hi ${student.full_name || 'there'},</p>
            <p style="color:#475569;">Your portfolio item <strong>"${itemTitle}"</strong> has been reviewed.</p>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:20px; margin:20px 0;">
              <p style="margin:0; color:#64748b; font-size:14px;">STATUS</p>
              <p style="margin:4px 0 0; font-size:18px; font-weight:700; color:${isApproved ? '#16a34a' : '#dc2626'};">
                ${isApproved ? '✅ Approved' : '📝 Needs Revision'}
              </p>
              ${data.reviewer_note ? `<p style="margin:12px 0 0; color:#475569; font-size:14px;">${data.reviewer_note}</p>` : ''}
            </div>
            <a href="${appUrl}/StudentPortfolio" style="display:inline-block; background:#7c3aed; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600; margin-top:8px;">
              View Portfolio →
            </a>
            <p style="color:#94a3b8; font-size:12px; margin-top:24px;">MarTech Mastery Matrix Program</p>
            </div>
            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px; text-align: center;">
              <p style="color: #cbd5e1; font-size: 11px; margin: 0;">© MarTech Mastery by OAD Solutions</p>
            </div>
          </div>
        `
      });
      console.log('Portfolio feedback email sent:', JSON.stringify(emailResult));
    }

    // 2. In-app notification
    await db.entities.Notification.create({
      user_id: studentId,
      type: isApproved ? 'portfolio_approved' : 'portfolio_needs_revision',
      title: isApproved ? `✅ Portfolio Item Approved` : `📝 Revision Needed`,
      message: isApproved
        ? `"${itemTitle}" has been approved. Great work!`
        : `"${itemTitle}" needs revision. ${data.reviewer_note ? data.reviewer_note : 'Tap to view feedback.'}`,
      link_url: `/StudentPortfolio`,
      related_entity_id: event.entity_id,
    });

    return Response.json({ success: true, type: newStatus, student_email: student?.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});