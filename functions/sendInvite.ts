import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { email, full_name, app_role, cohort_id } = payload;

    if (!email || !full_name) {
      return Response.json({ error: 'Email and full name required' }, { status: 400 });
    }

    // Generate unique secure token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Set expiry to 7 days from now
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    // Create invitation record first
    const invitation = await base44.asServiceRole.entities.Invitation.create({
      email,
      full_name,
      intended_app_role: app_role || 'student',
      cohort_id: cohort_id || null,
      token,
      status: 'pending',
      invited_by: user.email,
      sent_date: new Date().toISOString(),
      expiry_date: expiryDate.toISOString(),
    });

    // Generate custom invitation link
    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://app.martech-mastery.com';
    const invitationLink = `${appUrl}/AcceptInvitation?token=${token}`;

    // Send custom invitation email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'MarTech Mastery Academy <onboarding@resend.dev>',
        to: [email],
        subject: 'You\'re Invited to Join MarTech Mastery Academy',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">Welcome to MarTech Mastery Academy!</h2>
            <p>Hi ${full_name},</p>
            <p>You've been invited to join MarTech Mastery Academy by ${user.full_name || user.email}.</p>
            <p>Click the button below to create your account and get started:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" 
                 style="background-color: #f97316; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Create Your Account
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${invitationLink}">${invitationLink}</a>
            </p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This invitation was sent to ${email}. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `
      })
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      throw new Error(`Resend API error: ${errorData.message || 'Failed to send email'}`);
    }

    return Response.json({ 
      success: true, 
      message: 'Invitation sent successfully',
      invitation_id: invitation.id,
      invitation_link: invitationLink
    });
  } catch (error) {
    console.error('Invitation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to send invitation',
      details: error.toString()
    }, { status: 500 });
  }
});