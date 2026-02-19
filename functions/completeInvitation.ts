import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { token, user_id } = payload;
    const base44 = createClientFromRequest(req);

    if (!token || !user_id) {
      return Response.json({ error: 'Token and user_id are required' }, { status: 400 });
    }

    // Fetch invitation
    const invitations = await base44.asServiceRole.entities.Invitation.filter({ token: token });

    if (!invitations || invitations.length === 0) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const invitation = invitations[0];

    // Update invitation status
    await base44.asServiceRole.entities.Invitation.update(invitation.id, {
      status: 'accepted',
      accepted_date: new Date().toISOString(),
      user_id: user_id
    });

    // Update user with role and full name
    await base44.asServiceRole.entities.User.update(user_id, {
      app_role: invitation.intended_app_role || 'student',
      full_name: invitation.full_name || ''
    });

    // If cohort_id is specified, create cohort membership
    if (invitation.cohort_id && invitation.intended_app_role === 'student') {
      await base44.asServiceRole.entities.CohortMembership.create({
        user_id: user_id,
        cohort_id: invitation.cohort_id,
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active'
      });
    } else if (invitation.cohort_id && invitation.intended_app_role === 'tutor') {
      await base44.asServiceRole.entities.TutorCohortAssignment.create({
        tutor_id: user_id,
        cohort_id: invitation.cohort_id,
        assigned_date: new Date().toISOString().split('T')[0],
        is_primary: true
      });
    }

    return Response.json({
      success: true,
      redirect_role: invitation.intended_app_role || 'student'
    });
  } catch (error) {
    console.error('Complete invitation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to complete invitation' 
    }, { status: 500 });
  }
});