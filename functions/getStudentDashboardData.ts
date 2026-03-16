import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's cohort membership
    const allMemberships = await base44.asServiceRole.entities.CohortMembership.filter({ 
      user_id: user.id
    });
    const memberships = allMemberships.filter(m => m.status === 'active');
    
    if (memberships.length === 0) {
      return Response.json({ tutor: null, leaderboardData: [], stats: { points: 0, streak: 0, submissions: { total: 0, graded: 0 }, attendance: { total: 0, present: 0 } } });
    }

    const membership = memberships[0];

    // Fetch everything in parallel for speed
    const [
      allUsers,
      tutorAssignments,
      cohortMembers,
      userLedger,
      loginEvents,
      userSubmissions,
      attendanceRecords,
    ] = await Promise.all([
      base44.asServiceRole.entities.User.list('created_date', 1000),
      base44.asServiceRole.entities.TutorCohortAssignment.filter({ cohort_id: membership.cohort_id }),
      base44.asServiceRole.entities.CohortMembership.filter({ cohort_id: membership.cohort_id, status: 'active' }),
      base44.asServiceRole.entities.PointsLedger.filter({ user_id: user.id }),
      base44.asServiceRole.entities.LoginEvent.filter({ user_id: user.id }),
      base44.asServiceRole.entities.Submission.filter({ user_id: user.id }),
      base44.asServiceRole.entities.Attendance.filter({ student_user_id: user.id }),
    ]);

    // --- Tutor resolution ---
    tutorAssignments.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
    let tutor = null;
    for (const assignment of tutorAssignments) {
      const found = allUsers.find(u => u.id === assignment.tutor_id);
      if (found) {
        tutor = {
          id: found.id,
          full_name: found.full_name,
          email: found.email,
          display_name: found.display_name || found.data?.display_name || found.full_name,
          profile_picture: found.profile_picture || found.data?.profile_picture || null,
          bio: found.bio || found.data?.bio || null,
        };
        break;
      }
    }

    // --- Leaderboard: only fetch ledger for cohort members (not all 10k rows) ---
    const memberIds = cohortMembers.map(m => m.user_id);
    // Fetch ledger entries only for cohort members in parallel batches of 10
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < memberIds.length; i += batchSize) {
      batches.push(memberIds.slice(i, i + batchSize));
    }
    const ledgerResults = await Promise.all(
      batches.map(batch =>
        Promise.all(batch.map(uid => base44.asServiceRole.entities.PointsLedger.filter({ user_id: uid })))
      )
    );
    const allMemberLedger = ledgerResults.flat(2);

    const pointsByUser = {};
    allMemberLedger.forEach(entry => {
      pointsByUser[entry.user_id] = (pointsByUser[entry.user_id] || 0) + entry.points;
    });

    const students = allUsers.filter(u => memberIds.includes(u.id));
    const leaderboard = students
      .map(student => ({
        id: student.id,
        name: student.display_name || student.full_name,
        points: pointsByUser[student.id] || 0,
        isMe: student.id === user.id,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    // --- Stats: points ---
    const totalPoints = userLedger.reduce((sum, e) => sum + e.points, 0);

    // --- Stats: login streak ---
    const dates = loginEvents.map(e => e.login_time.split('T')[0]).sort().reverse();
    const uniqueDates = [...new Set(dates)];
    let streak = 0;
    for (let i = 0; i < uniqueDates.length; i++) {
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toISOString().split('T')[0];
      if (uniqueDates[i] === expectedStr) {
        streak++;
      } else {
        break;
      }
    }

    // --- Stats: submissions ---
    const submissionsStats = {
      total: userSubmissions.length,
      graded: userSubmissions.filter(s => s.status === 'graded').length,
    };

    // --- Stats: attendance ---
    const attendanceStats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(r => r.status === 'present').length,
    };

    return Response.json({ 
      tutor,
      leaderboardData: leaderboard,
      stats: {
        points: totalPoints,
        streak,
        submissions: submissionsStats,
        attendance: attendanceStats,
      },
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});