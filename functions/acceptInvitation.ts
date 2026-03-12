import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { token, full_name, password } = payload;
    const base44 = createClientFromRequest(req);

    if (!token || !password || !full_name) {
      return Response.json({ error: 'Token, full name, and password are required' }, { status: 400 });
    }

    // --- Input Validation ---
    if (typeof token !== 'string' || token.trim().length < 10) {
      return Response.json({ error: 'Invalid token format' }, { status: 400 });
    }
    if (typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.trim().length > 100) {
      return Response.json({ error: 'full_name must be between 2 and 100 characters' }, { status: 400 });
    }
    // Sanitize full_name: strip HTML/script tags
    const sanitizedName = full_name.replace(/<[^>]*>/g, '').trim();
    if (sanitizedName !== full_name.trim()) {
      return Response.json({ error: 'full_name contains invalid characters' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Fetch and validate invitation
    const invitations = await base44.asServiceRole.entities.Invitation.filter({ token: token });

    if (!invitations || invitations.length === 0) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const invitation = invitations[0];

    // Validate invitation
    if (invitation.expiry_date && new Date(invitation.expiry_date) < new Date()) {
      return Response.json({ error: 'Invitation expired' }, { status: 400 });
    }

    if (invitation.status !== 'pending') {
      return Response.json({ error: 'Invitation no longer valid' }, { status: 400 });
    }

    // Check if user already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: invitation.email });
    if (existingUsers && existingUsers.length > 0) {
      return Response.json({ error: 'User already exists' }, { status: 400 });
    }

    // Invite the user (creates account)
    await base44.asServiceRole.users.inviteUser(
      invitation.email,
      invitation.intended_app_role || 'student'
    );
    
    console.log('User invited successfully');

    // Get the newly created user
    const users = await base44.asServiceRole.entities.User.filter({ email: invitation.email });
    if (!users || users.length === 0) {
      throw new Error('User creation failed');
    }
    
    const userId = users[0].id;

    // Update user with display_name and status
    await base44.asServiceRole.entities.User.update(userId, {
      display_name: full_name,
      status: 'active'
    });

    // Update invitation status
    await base44.asServiceRole.entities.Invitation.update(invitation.id, {
      status: 'accepted',
      accepted_date: new Date().toISOString(),
      user_id: userId
    });

    // If cohort_id is specified, create cohort membership
    if (invitation.cohort_id && invitation.intended_app_role === 'student') {
      await base44.asServiceRole.entities.CohortMembership.create({
        user_id: userId,
        cohort_id: invitation.cohort_id,
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active'
      });
    } else if (invitation.cohort_id && invitation.intended_app_role === 'tutor') {
      await base44.asServiceRole.entities.TutorCohortAssignment.create({
        tutor_id: userId,
        cohort_id: invitation.cohort_id,
        assigned_date: new Date().toISOString().split('T')[0],
        is_primary: true
      });
    }

    return Response.json({
      success: true,
      message: 'Account created successfully',
      redirect_role: invitation.intended_app_role || 'student'
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to create account' 
    }, { status: 500 });
  }
});