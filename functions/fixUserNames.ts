import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.app_role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    // Fetch all users and all invitations
    const allUsers = await base44.asServiceRole.entities.User.list();
    const allInvitations = await base44.asServiceRole.entities.Invitation.list();

    // Build a map of email -> invitation full_name
    const inviteNameByEmail = {};
    for (const inv of allInvitations) {
      if (inv.email && inv.full_name && inv.full_name.trim()) {
        inviteNameByEmail[inv.email.toLowerCase()] = inv.full_name.trim();
      }
    }

    let updated = 0;
    let skipped = 0;
    const changes = [];

    for (const u of allUsers) {
      const emailKey = u.email?.toLowerCase();
      const inviteName = inviteNameByEmail[emailKey];

      if (!inviteName) {
        skipped++;
        continue;
      }

      // Check if current name looks email-derived (matches email prefix)
      const emailPrefix = u.email?.split('@')[0] || '';
      const currentName = u.full_name || '';

      // Consider it email-derived if it matches the prefix (with common transformations)
      const normalise = (s) => s.toLowerCase().replace(/[._\-+]/g, '');
      const nameIsEmailDerived = normalise(currentName) === normalise(emailPrefix);

      if (nameIsEmailDerived && inviteName !== currentName) {
        await base44.asServiceRole.entities.User.update(u.id, { full_name: inviteName });
        changes.push({ email: u.email, old: currentName, new: inviteName });
        updated++;
      } else {
        skipped++;
      }
    }

    return Response.json({ success: true, updated, skipped, changes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});