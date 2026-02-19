import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { token, full_name, password } = payload;
    const base44 = createClientFromRequest(req);

    if (!token || !password || !full_name) {
      return Response.json({ error: 'Token, full name, and password are required' }, { status: 400 });
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

    // Create user account using Base44 signup endpoint
    const baseUrl = Deno.env.get('BASE44_API_URL') || 'https://api.base44.com';
    const signupUrl = `${baseUrl}/v1/auth/signup`;
    
    const signupResponse = await fetch(signupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-id': Deno.env.get('BASE44_APP_ID')
      },
      body: JSON.stringify({
        email: invitation.email,
        password: password,
        full_name: full_name
      })
    });

    if (!signupResponse.ok) {
      const errorText = await signupResponse.text();
      console.error('Signup failed:', errorText);
      return Response.json({ 
        error: `Failed to create account: ${signupResponse.status} ${signupResponse.statusText}` 
      }, { status: 400 });
    }

    const signupData = await signupResponse.json();
    console.log('Signup successful:', signupData);

    // Update invitation status
    await base44.asServiceRole.entities.Invitation.update(invitation.id, {
      status: 'accepted',
      accepted_date: new Date().toISOString()
    });

    // Get the newly created user
    const users = await base44.asServiceRole.entities.User.filter({ email: invitation.email });
    if (users && users.length > 0) {
      const userId = users[0].id;

      // Update user with app_role and status
      await base44.asServiceRole.entities.User.update(userId, {
        app_role: invitation.intended_app_role || 'student',
        status: 'active'
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

      // Store user_id in invitation for record keeping
      await base44.asServiceRole.entities.Invitation.update(invitation.id, {
        user_id: userId
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