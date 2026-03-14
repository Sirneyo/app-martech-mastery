import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cohortIds } = await req.json();
    if (!cohortIds || cohortIds.length === 0) return Response.json({ leaderboards: {} });

    // Fetch memberships and points with service role
    const [memberships, allPoints, allUsers] = await Promise.all([
      base44.asServiceRole.entities.CohortMembership.filter({ status: 'active' }),
      base44.asServiceRole.entities.PointsLedger.list(),
      base44.asServiceRole.entities.User.list(),
    ]);

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
            name: userData?.full_name || 'Unknown',
            points,
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