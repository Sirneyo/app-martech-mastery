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

    // Create invitation record first
    const invitation = await base44.asServiceRole.entities.Invitation.create({
      email,
      full_name,
      intended_app_role: app_role || 'student',
      cohort_id: cohort_id || null,
      status: 'pending',
      invited_by: user.email,
      sent_date: new Date().toISOString(),
    });

    // Generate invitation link manually since native inviteUser requires special setup
    const inviteUrl = `${Deno.env.get('BASE_URL') || 'https://app.martech-mastery.com'}/AcceptInvite?email=${encodeURIComponent(email)}&name=${encodeURIComponent(full_name)}`;
    
    // Send email with invitation
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to MarTech Mastery!</h2>
        <p>Hi ${full_name},</p>
        <p>You've been invited to join MarTech Mastery as a ${app_role}.</p>
        <p><a href="${inviteUrl}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
        <p>Or copy this link: ${inviteUrl}</p>
        <p>Best regards,<br/>The MarTech Mastery Team</p>
      </div>
    `;
    
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'MarTech Mastery',
      to: email,
      subject: 'You\'re invited to MarTech Mastery',
      body: emailBody,
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