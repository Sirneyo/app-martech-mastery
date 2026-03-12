import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.app_role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    // Fetch all users and all accepted invitations
    const allUsers = await base44.asServiceRole.entities.User.list();
    const allInvitations = await base44.asServiceRole.entities.Invitation.list('', 500);

    // Build a map of email -> invitation full_name (fields are inside .data)
    const inviteNameByEmail = {};
    for (const inv of allInvitations) {
      const d = inv.data || {};
      if (d.email && d.full_name && d.full_name.trim() && d.status === 'accepted') {
        const key = d.email.toLowerCase();
        // Keep the most recent accepted invitation name
        if (!inviteNameByEmail[key]) {
          inviteNameByEmail[key] = d.full_name.trim();
        }
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

      // Consider it email-derived if it matches the email prefix
      const emailPrefix = u.email?.split('@')[0] || '';
      const currentName = u.full_name || '';
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