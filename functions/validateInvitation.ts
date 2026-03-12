import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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
    const inv = invitation.data || {};

    // Check if expired
    if (inv.expiry_date && new Date(inv.expiry_date) < new Date()) {
      return Response.json({ error: 'This invitation has expired' }, { status: 400 });
    }

    if (inv.status === 'accepted') {
      return Response.json({ error: 'This invitation has already been used' }, { status: 400 });
    }

    if (inv.status === 'cancelled') {
      return Response.json({ error: 'This invitation has been cancelled' }, { status: 400 });
    }

    // Check if user already exists
    const users = await base44.asServiceRole.entities.User.filter({ email: inv.email });
    const userExists = users && users.length > 0;

    return Response.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: inv.email,
        full_name: inv.full_name,
        intended_app_role: inv.intended_app_role,
        cohort_id: inv.cohort_id
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