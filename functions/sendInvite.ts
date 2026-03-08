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
        from: 'Martech Mastery Academy <noreply@app.martech-mastery.com>',
        to: [email],
        subject: 'You\'re Invited to Join MarTech Mastery Academy',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(30,45,90,0.10);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #2c67efff 0%, rgba(167, 222, 236, 1)ff 100%); padding: 32px 40px; text-align: center;">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693261f4a46b591b7d38e623/5875581de_Fulllogo.png" alt="MarTech Mastery" style="max-width: 150px; height: auto; display: block; margin: 0 auto;" />
            </div>

            <!-- Body -->
            <div style="padding: 40px 40px 32px;">
              <h2 style="color: #1a2d5a; font-size: 22px; margin: 0 0 8px;">You're Invited! 🎓</h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hi <strong>${full_name}</strong>,</p>
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                <strong>${user.full_name || user.email}</strong> has invited you to join the <strong style="color: #1a2d5a;">MarTech Mastery Learning Platform</strong> — your gateway to mastering modern marketing technology.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${invitationLink}" style="background: linear-gradient(135deg, #f97316, #ea6c0a); color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(249,115,22,0.35);">
                  Create Your Account →
                </a>
              </div>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />

              <p style="color: #94a3b8; font-size: 13px; margin: 0 0 6px;">Or copy and paste this link into your browser:</p>
              <p style="margin: 0;"><a href="${invitationLink}" style="color: #f97316; font-size: 13px; word-break: break-all;">${invitationLink}</a></p>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                This invitation was sent to <strong>${email}</strong>. If you didn't expect this, you can safely ignore it.
              </p>
              <p style="color: #cbd5e1; font-size: 11px; margin: 8px 0 0;">© MarTech Mastery by OAD Solutions</p>
            </div>
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