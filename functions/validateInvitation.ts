import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token is required' }, { status: 400 });
    }

    // Fetch invitation by token using service role
    const invitations = await base44.asServiceRole.entities.Invitation.filter({ token: token });

    if (!invitations || invitations.length === 0) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const invitation = invitations[0];

    // Check if expired
    if (invitation.expiry_date && new Date(invitation.expiry_date) < new Date()) {
      return Response.json({ error: 'This invitation has expired' }, { status: 400 });
    }

    if (invitation.status === 'accepted') {
      return Response.json({ error: 'This invitation has already been used' }, { status: 400 });
    }

    if (invitation.status === 'cancelled') {
      return Response.json({ error: 'This invitation has been cancelled' }, { status: 400 });
    }

    // Check if user already exists
    const users = await base44.asServiceRole.entities.User.filter({ email: invitation.email });
    const userExists = users && users.length > 0;

    return Response.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        full_name: invitation.full_name,
        intended_app_role: invitation.intended_app_role,
        cohort_id: invitation.cohort_id
      },
      userExists
    });
  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to validate invitation' 
    }, { status: 500 });
  }
});