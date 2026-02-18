import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, full_name, app_role, cohort_id } = await req.json();

    if (!email || !full_name) {
      return Response.json({ error: 'Email and full name required' }, { status: 400 });
    }

    // Create invitation token
    const invitationToken = crypto.randomUUID();
    
    // Create invitation record with custom token
    const invitation = await base44.asServiceRole.entities.Invitation.create({
      id: invitationToken,
      email,
      full_name,
      intended_app_role: app_role || 'student',
      cohort_id: cohort_id || null,
      status: 'pending',
      invited_by: user.email,
      sent_date: new Date().toISOString(),
    });

    // Generate invitation link to custom AcceptInvite page
    const appUrl = `https://${Deno.env.get('BASE44_APP_ID')}.base44.com`;
    const inviteLink = `${appUrl}/accept-invite/${invitationToken}?email=${encodeURIComponent(email)}`;

    // Send custom invitation email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      from_name: 'MarTech Mastery',
      subject: 'Welcome to MarTech Mastery - Set Your Password',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">Welcome to MarTech Mastery!</h2>
          <p>Hi ${full_name},</p>
          <p>You've been invited to join MarTech Mastery as a <strong>${app_role || 'student'}</strong>.</p>
          <p>Click the button below to set your password and access your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Set Your Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">${inviteLink}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">This invitation link will expire after use.</p>
        </div>
      `
    });

    return Response.json({ 
      success: true, 
      message: 'Invitation sent successfully',
      invitation_id: invitation.id,
      from_email: 'no-reply@app.martech-mastery.com'
    });
  } catch (error) {
    console.error('Invitation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to send invitation',
      details: error.toString()
    }, { status: 500 });
  }
});