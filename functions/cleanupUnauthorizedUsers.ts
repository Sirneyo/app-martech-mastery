import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all non-admin users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const nonAdminUsers = allUsers.filter(u => u.role !== 'admin');

    // Get all accepted invitations
    const invitations = await base44.asServiceRole.entities.Invitation.list();
    const acceptedEmails = new Set(invitations.map(inv => inv.email?.toLowerCase()));

    const deleted = [];

    for (const user of nonAdminUsers) {
      const email = user.email?.toLowerCase();
      if (!acceptedEmails.has(email)) {
        console.log(`Deleting unauthorized user: ${email}`);
        await base44.asServiceRole.entities.User.delete(user.id);
        deleted.push(email);
      }
    }

    return Response.json({ success: true, deleted_count: deleted.length, deleted });
  } catch (error) {
    console.error('cleanupUnauthorizedUsers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});