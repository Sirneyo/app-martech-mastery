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
  <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 24px; border-radius: 12px 12px 0 0;">
    <h2 style="color: white; margin: 0;">New Support Ticket</h2>
    <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">MarTech Mastery Academy</p>
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

    return Response.json({ success: true, notified: recipients });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});