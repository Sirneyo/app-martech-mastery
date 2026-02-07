import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { email, full_name, app_role, cohortName, invitationId } = await req.json();

    const roleLabel = app_role === 'student' ? 'Student' : 
                      app_role === 'tutor' ? 'Tutor' : 'Admin';

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Martech Academy</h1>
        </div>
        
        <div style="padding: 40px; background: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${full_name || 'there'}!</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            You've been invited to join Martech Academy as a <strong>${roleLabel}</strong>.
            ${cohortName ? `You'll be part of the <strong>${cohortName}</strong> cohort.` : ''}
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Click the button below to accept your invitation and set up your account:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get('BASE44_APP_URL')}/accept-invite/${invitationId}?email=${encodeURIComponent(email)}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 40px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold; 
                      display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you have any questions, please don't hesitate to reach out to our support team.
          </p>
        </div>
        
        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Martech Academy. All rights reserved.
          </p>
        </div>
      </div>
    `;

    await base44.integrations.Core.SendEmail({
      from_name: 'Martech Academy',
      to: email,
      subject: `Welcome to Martech Academy - ${roleLabel} Invitation`,
      body: emailBody
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Send invitation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});