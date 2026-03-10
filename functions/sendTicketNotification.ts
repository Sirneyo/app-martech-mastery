import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ticket_id } = await req.json();

    const tickets = await base44.asServiceRole.entities.SupportTicket.filter({ id: ticket_id });
    const ticket = tickets[0];
    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

    const priorityLabel = ticket.priority === 'high' ? '🔴 High' : ticket.priority === 'medium' ? '🟡 Medium' : '🟢 Low';
    const typeLabel = ticket.ticket_type === 'technical' ? 'Technical Support' : 'Program Support';

    const emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #9dc6f0; padding: 32px 40px; text-align: center; border-radius: 12px 12px 0 0;">
    <img src="https://app.martech-mastery.com/api/apps/693261f4a46b591b7d38e623/files/public/693261f4a46b591b7d38e623/5875581de_Fulllogo.png" alt="MarTech Mastery" style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;" />
    <h2 style="color: #1a2d5a; margin: 0;">New Support Ticket</h2>
  </div>
  <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Type:</td><td style="padding: 8px 0; font-weight: 600;">${typeLabel}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Priority:</td><td style="padding: 8px 0; font-weight: 600;">${priorityLabel}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Student:</td><td style="padding: 8px 0;">${ticket.student_name}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${ticket.student_email}">${ticket.student_email}</a></td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Subject:</td><td style="padding: 8px 0; font-weight: 600;">${ticket.subject}</td></tr>
    </table>
    <div style="margin-top: 16px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
      <p style="color: #64748b; margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Description</p>
      <p style="color: #1e293b; margin: 0; white-space: pre-wrap;">${ticket.description}</p>
    </div>
    <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">Ticket ID: ${ticket.id} · Submitted: ${new Date(ticket.created_date).toLocaleString()}</p>
  </div>
</div>`;

    const recipients = ['admin@oadsolutions.com', 'niyi@oadsolutions.com'];

    // For program support, also notify the assigned tutor
    if (ticket.ticket_type === 'program' && ticket.cohort_id) {
      const assignments = await base44.asServiceRole.entities.TutorCohortAssignment.filter({ cohort_id: ticket.cohort_id });
      for (const assignment of assignments) {
        const tutors = await base44.asServiceRole.entities.User.filter({ id: assignment.tutor_id });
        if (tutors[0]?.email && !recipients.includes(tutors[0].email)) {
          recipients.push(tutors[0].email);
        }
      }
    }

    // Send emails
    for (const email of recipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `[${typeLabel}] ${ticket.subject} - ${ticket.student_name}`,
        body: emailBody
      });
    }

    // Create in-app notifications for all admin/super_admin users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUsers = allUsers.filter(u => u.app_role === 'admin' || u.app_role === 'super_admin');
    for (const adminUser of adminUsers) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: adminUser.id,
        type: 'achievement',
        title: `New ${typeLabel} Ticket`,
        message: `${ticket.student_name}: "${ticket.subject}" — ${ticket.priority} priority`,
        link_url: '/AdminSupportTickets',
        is_read: false,
      });
    }

    return Response.json({ success: true, notified: recipients });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});