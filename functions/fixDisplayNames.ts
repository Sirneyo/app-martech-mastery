import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// One-time utility: copies invitation full_name into display_name for users with email-derived names
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allUsers = await base44.asServiceRole.entities.User.list();
    const allInvitations = await base44.asServiceRole.entities.Invitation.list('', 500);

    // Build email -> invited full_name map from accepted invitations
    const inviteNameByEmail = {};
    for (const inv of allInvitations) {
      if (inv.email && inv.full_name && inv.full_name.trim()) {
        const key = inv.email.toLowerCase();
        if (!inviteNameByEmail[key]) {
          inviteNameByEmail[key] = inv.full_name.trim();
        }
      }
    }

    let updated = 0;
    let skipped = 0;
    const changes = [];

    const normalise = (s) => (s || '').toLowerCase().replace(/[._\-+]/g, '');

    for (const u of allUsers) {
      const emailKey = u.email?.toLowerCase();
      const inviteName = inviteNameByEmail[emailKey];

      const emailPrefix = u.email?.split('@')[0] || '';
      const currentDisplayName = u.display_name || '';
      const currentFullName = u.full_name || '';

      // Check if display_name is already a real name (not email-derived and not empty)
      const displayIsEmailDerived = !currentDisplayName.trim() || normalise(currentDisplayName) === normalise(emailPrefix);

      if (!displayIsEmailDerived) {
        skipped++;
        continue;
      }

      // Use invite name if available, otherwise try to clean up full_name
      const nameToUse = inviteName || (normalise(currentFullName) !== normalise(emailPrefix) ? currentFullName : null);

      if (!nameToUse) {
        skipped++;
        continue;
      }

      await base44.asServiceRole.entities.User.update(u.id, { display_name: nameToUse });
      changes.push({ email: u.email, old: currentDisplayName || currentFullName, new: nameToUse });
      updated++;
    }

    return Response.json({ success: true, updated, skipped, changes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});