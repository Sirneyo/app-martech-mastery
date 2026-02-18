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

    // Map app_role to Base44 role (only "user" or "admin" allowed)
    const base44Role = (app_role === 'admin') ? 'admin' : 'user';
    
    console.log('Inviting user with role:', base44Role, 'from app_role:', app_role);
    
    // Use Base44's native invitation system to create user and send email
    await base44.users.inviteUser(email, base44Role);

    // After successful Base44 invite, also update the User entity with app_role
    // Wait a moment for the user to be created in Base44's system
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Find the newly created user and update their app_role
    try {
      const users = await base44.asServiceRole.entities.User.filter({ email: email });
      if (users && users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, {
          app_role: app_role || 'student',
          status: 'active'
        });
      }
    } catch (userUpdateError) {
      console.warn('Could not update user app_role immediately:', userUpdateError.message);
    }

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