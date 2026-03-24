import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// One-time utility: fixes users whose full_name is just their email prefix
// by replacing it with the name from their accepted invitation.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.app_role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list();
    const allInvitations = await base44.asServiceRole.entities.Invitation.list('', 500);

    // Build email -> invited full_name map from accepted invitations
    const inviteNameByEmail = {};
    for (const inv of allInvitations) {
      if (inv.email && inv.full_name && inv.full_name.trim() && inv.status === 'accepted') {
        const key = inv.email.toLowerCase();
        if (!inviteNameByEmail[key]) {
          inviteNameByEmail[key] = inv.full_name.trim();
        }
      }
    }

    let updated = 0;
    let skipped = 0;
    const changes = [];

    for (const u of allUsers) {
      const emailKey = u.email?.toLowerCase();
      const inviteName = inviteNameByEmail[emailKey];

      if (!inviteName) { skipped++; continue; }

      const emailPrefix = u.email?.split('@')[0] || '';
      const currentName = u.display_name || u.full_name || '';
      const normalise = (s) => s.toLowerCase().replace(/[._\-+]/g, '');
      const nameIsEmailDerived = normalise(currentName) === normalise(emailPrefix) || !currentName.trim();

      if (nameIsEmailDerived && inviteName !== currentName) {
        await base44.asServiceRole.entities.User.update(u.id, { display_name: inviteName });
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