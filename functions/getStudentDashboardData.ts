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

    // Get tutor using service role - try primary first, then any tutor
    let tutorAssignments = await base44.entities.TutorCohortAssignment.filter({ 
      cohort_id: membership.cohort_id,
      is_primary: true 
    });

    // If no primary tutor, get any tutor assigned to this cohort
    if (tutorAssignments.length === 0) {
      tutorAssignments = await base44.entities.TutorCohortAssignment.filter({ 
        cohort_id: membership.cohort_id
      });
    }

    let tutor = null;
    if (tutorAssignments.length > 0) {
      const tutorId = tutorAssignments[0].tutor_id;
      try {
        tutor = await base44.asServiceRole.entities.User.get(tutorId);
      } catch (error) {
        console.error(`Error fetching tutor ${tutorId}:`, error.message);
        tutor = null;
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

    // Get all cohort users using service role
    const cohortUsers = await base44.asServiceRole.entities.User.list();
    const students = cohortUsers.filter(u => memberIds.includes(u.id));

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