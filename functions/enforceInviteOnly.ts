import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const base44 = createClientFromRequest(req);

    // This is called by an entity automation on User create
    const userId = payload?.event?.entity_id;
    const userData = payload?.data;

    if (!userId || !userData?.email) {
      return Response.json({ error: 'Missing user data' }, { status: 400 });
    }

    // Check if there's a valid pending invitation for this email
    const invitations = await base44.asServiceRole.entities.Invitation.filter({
      email: userData.email,
      status: 'pending'
    });

    const hasValidInvitation = invitations && invitations.length > 0 &&
      invitations.some(inv => !inv.expiry_date || new Date(inv.expiry_date) >= new Date());

    if (!hasValidInvitation) {
      console.log(`No valid invitation found for ${userData.email} - deleting user`);
      await base44.asServiceRole.entities.User.delete(userId);
      return Response.json({ success: true, action: 'deleted', reason: 'No valid invitation' });
    }

    console.log(`Valid invitation found for ${userData.email} - user allowed`);
    return Response.json({ success: true, action: 'allowed' });
  } catch (error) {
    console.error('enforceInviteOnly error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});