import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cohortIds } = await req.json();
    if (!cohortIds || cohortIds.length === 0) return Response.json({ leaderboards: {} });

    // Fetch memberships (active only) and users in parallel
    const [memberships, allUsers] = await Promise.all([
      base44.asServiceRole.entities.CohortMembership.filter({ status: 'active' }),
      base44.asServiceRole.entities.User.list('created_date', 1000),
    ]);

    // Collect all member IDs across all cohorts
    const allMemberIds = [...new Set(
      memberships
        .filter(m => cohortIds.includes(m.cohort_id))
        .map(m => m.user_id)
    )];

    // Fetch ledger only for these members in parallel batches
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < allMemberIds.length; i += batchSize) {
      batches.push(allMemberIds.slice(i, i + batchSize));
    }
    const ledgerResults = await Promise.all(
      batches.map(batch =>
        Promise.all(batch.map(uid => base44.asServiceRole.entities.PointsLedger.filter({ user_id: uid })))
      )
    );
    const allPoints = ledgerResults.flat(2);

    const leaderboards = {};

    for (const cohortId of cohortIds) {
      const cohortMemberIds = memberships
        .filter(m => m.cohort_id === cohortId)
        .map(m => m.user_id);

      const pointsByUser = {};
      allPoints
        .filter(p => cohortMemberIds.includes(p.user_id))
        .forEach(p => {
          pointsByUser[p.user_id] = (pointsByUser[p.user_id] || 0) + (p.points || 0);
        });

      leaderboards[cohortId] = Object.entries(pointsByUser)
        .map(([userId, points]) => {
          const userData = allUsers.find(u => u.id === userId);
          return {
            id: userId,
            name: userData?.display_name || userData?.full_name || 'Unknown',
            points,
            profile_picture: userData?.profile_picture || null,
          };
        })
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);
    }

    return Response.json({ leaderboards });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});