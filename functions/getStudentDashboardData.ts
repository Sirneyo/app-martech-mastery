import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's cohort membership
    const memberships = await base44.entities.CohortMembership.filter({ 
      user_id: user.id, 
      status: 'active' 
    });
    
    if (memberships.length === 0) {
      return Response.json({ tutor: null, leaderboardData: [] });
    }

    const membership = memberships[0];

    // Get all users via service role
    const allUsers = await base44.asServiceRole.entities.User.list();
    const allUserIds = new Set(allUsers.map(u => u.id));

    // Get ALL tutor assignments for this cohort via service role
    const tutorAssignments = await base44.asServiceRole.entities.TutorCohortAssignment.filter({ 
      cohort_id: membership.cohort_id
    });

    // Sort: primary first, then any
    tutorAssignments.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));

    // Find first tutor that still exists in the system
    let tutor = null;
    for (const assignment of tutorAssignments) {
      const found = allUsers.find(u => u.id === assignment.tutor_id);
      if (found) {
        tutor = found;
        break;
      }
    }

    // Get cohort members
    const cohortMembers = await base44.entities.CohortMembership.filter({ 
      cohort_id: membership.cohort_id, 
      status: 'active' 
    });

    // Get all points for cohort members
    const allLedger = await base44.entities.PointsLedger.list();
    const memberIds = cohortMembers.map(m => m.user_id);
    
    const pointsByUser = {};
    allLedger
      .filter(entry => memberIds.includes(entry.user_id))
      .forEach(entry => {
        pointsByUser[entry.user_id] = (pointsByUser[entry.user_id] || 0) + entry.points;
      });

    const students = allUsers.filter(u => memberIds.includes(u.id));

    // Build leaderboard
    const leaderboard = students
      .map(student => ({
        id: student.id,
        name: student.full_name,
        points: pointsByUser[student.id] || 0,
        isMe: student.id === user.id,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    return Response.json({ 
      tutor,
      leaderboardData: leaderboard 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});