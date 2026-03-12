import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allUsers = await base44.asServiceRole.entities.User.list();
    const allInvitations = await base44.asServiceRole.entities.Invitation.list('', 500);

    // Debug: log first invitation to see its structure
    const firstInv = allInvitations[0];
    console.log('First invitation keys:', Object.keys(firstInv || {}));
    console.log('First invitation data keys:', Object.keys(firstInv?.data || {}));
    console.log('Sample inv data:', JSON.stringify(firstInv?.data || {}));
    console.log('Direct full_name field:', firstInv?.full_name);

    // Debug: log first user
    const firstUser = allUsers[0];
    console.log('First user keys:', Object.keys(firstUser || {}));
    console.log('First user full_name:', firstUser?.full_name);
    console.log('First user email:', firstUser?.email);

    // Build a map of email -> invitation full_name
    const inviteNameByEmail = {};
    for (const inv of allInvitations) {
      // Try both nested .data and direct access
      const d = inv.data || inv;
      const email = d.email || inv.email;
      const fullName = d.full_name || inv.full_name;
      const status = d.status || inv.status;
      if (email && fullName && fullName.trim() && status === 'accepted') {
        const key = email.toLowerCase();
        if (!inviteNameByEmail[key]) {
          inviteNameByEmail[key] = fullName.trim();
        }
      }
    }

    console.log('Invite name map:', JSON.stringify(inviteNameByEmail));

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

      const emailPrefix = u.email?.split('@')[0] || '';
      const currentName = u.full_name || '';
      const normalise = (s) => s.toLowerCase().replace(/[._\-+]/g, '');
      const nameIsEmailDerived = normalise(currentName) === normalise(emailPrefix);

      console.log(`User ${u.email}: currentName="${currentName}", prefix="${emailPrefix}", emailDerived=${nameIsEmailDerived}, inviteName="${inviteName}"`);

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