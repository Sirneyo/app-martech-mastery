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

    // Map app_role to Base44 role (only "user" or "admin" allowed)
    const base44Role = app_role === 'admin' ? 'admin' : 'user';
    
    // Use Base44's native invitation system to create user and send email
    await base44.users.inviteUser(email, base44Role);

    // Track invitation in database after successful invite
    const invitation = await base44.asServiceRole.entities.Invitation.create({
      email,
      full_name,
      intended_app_role: app_role || 'student',
      cohort_id: cohort_id || null,
      status: 'pending',
      invited_by: user.email,
      sent_date: new Date().toISOString(),
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