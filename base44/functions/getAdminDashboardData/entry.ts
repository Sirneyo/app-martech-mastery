import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.app_role !== 'admin' && user.app_role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch everything in parallel
    const [
      users,
      cohorts,
      submissions,
      portfolioStatuses,
      examAttempts,
      memberships,
      tutorAssignments,
      loginEvents,
      portfolioTemplates,
    ] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Cohort.list(),
      base44.asServiceRole.entities.Submission.list('-submitted_date', 1000),
      base44.asServiceRole.entities.PortfolioItemStatus.list('-updated_date', 1000),
      base44.asServiceRole.entities.ExamAttempt.list('-created_date', 1000),
      base44.asServiceRole.entities.CohortMembership.list('created_date', 1000),
      base44.asServiceRole.entities.TutorCohortAssignment.list(),
      base44.asServiceRole.entities.LoginEvent.list('-login_time', 500),
      base44.asServiceRole.entities.PortfolioItemTemplate.list(),
    ]);

    // --- Stats ---
    const totalStudents = users.filter(u => u.app_role === 'student').length;
    const totalTutors = users.filter(u => u.app_role === 'tutor').length;
    const activeCohorts = cohorts.filter(c => c.status === 'active').length;
    const pendingSubmissions = submissions.filter(s => s.status === 'submitted' || s.status === 'in_review').length;
    const pendingPortfolioReviews = portfolioStatuses.filter(p => p.status === 'submitted' || p.status === 'in_review').length;
    const completedExams = examAttempts.filter(a => a.attempt_status === 'submitted' && a.pass_flag === true).length;

    // --- Overall leaderboard (top 5) ---
    const studentPoints = {};
    // Batch fetch points for all students
    const studentIds = users.filter(u => u.app_role === 'student').map(u => u.id);
    const ledgerEntries = studentIds.length > 0
      ? await base44.asServiceRole.entities.PointsLedger.list('-created_date', 5000)
      : [];

    ledgerEntries.forEach(entry => {
      studentPoints[entry.user_id] = (studentPoints[entry.user_id] || 0) + (entry.points || 0);
    });

    const overallLeaderboard = Object.entries(studentPoints)
      .map(([userId, points]) => {
        const u = users.find(u => u.id === userId);
        return { userId, name: u?.display_name || u?.full_name || 'Unknown', email: u?.email || '', points, profile_picture: u?.profile_picture || null };
      })
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);

    // --- Cohort leaderboards ---
    const userIdSet = new Set(users.map(u => u.id));
    const cohortLeaderboards = cohorts.sort((a, b) => new Date(a.start_date) - new Date(b.start_date)).map(cohort => {
      const cohortMemberIds = new Set(
        memberships.filter(m => m.cohort_id === cohort.id && m.status === 'active' && userIdSet.has(m.user_id)).map(m => m.user_id)
      );
      const cohortPoints = {};
      ledgerEntries.forEach(entry => {
        if (cohortMemberIds.has(entry.user_id)) {
          cohortPoints[entry.user_id] = (cohortPoints[entry.user_id] || 0) + (entry.points || 0);
        }
      });
      const leaderboard = Object.entries(cohortPoints)
        .map(([userId, points]) => {
          const u = users.find(u => u.id === userId);
          return { userId, name: u?.display_name || u?.full_name || 'Unknown', points, profile_picture: u?.profile_picture || null };
        })
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);
      return { cohort, leaderboard };
    });

    // --- Cohort health ---
    const cohortHealthData = cohorts.sort((a, b) => new Date(a.start_date) - new Date(b.start_date)).map(cohort => {
      const cohortMembers = memberships.filter(m => m.cohort_id === cohort.id && m.status === 'active' && userIdSet.has(m.user_id));
      const cohortTutors = tutorAssignments.filter(ta => ta.cohort_id === cohort.id && ta.is_primary);
      const cohortPendingSubmissions = submissions.filter(s => s.cohort_id === cohort.id && ['submitted', 'in_review'].includes(s.status)).length;
      const cohortNeedsRevision = submissions.filter(s => s.cohort_id === cohort.id && s.status === 'needs_revision').length;
      const cohortPendingPortfolio = portfolioStatuses.filter(ps => ps.cohort_id === cohort.id && ['submitted', 'in_review'].includes(ps.status)).length;
      const cohortPasses = examAttempts.filter(ea => ea.cohort_id === cohort.id && ea.pass_flag).length;
      const cohortSubmittedAttempts = examAttempts.filter(ea => ea.cohort_id === cohort.id && ea.submitted_at).length;
      const certPassRate = cohortSubmittedAttempts > 0 ? Math.round((cohortPasses / cohortSubmittedAttempts) * 100) : 0;
      return {
        cohort,
        activeStudents: cohortMembers.length,
        tutors: cohortTutors.length,
        pendingSubmissions: cohortPendingSubmissions,
        needsRevision: cohortNeedsRevision,
        pendingPortfolio: cohortPendingPortfolio,
        certPasses: cohortPasses,
        certPassRate,
      };
    });

    // --- Oldest ungraded submissions (top 10) ---
    const oldestSubmissions = submissions
      .filter(s => ['submitted', 'in_review'].includes(s.status))
      .sort((a, b) => new Date(a.submitted_date) - new Date(b.submitted_date))
      .slice(0, 10)
      .map(s => {
        const student = users.find(u => u.id === s.user_id);
        const cohort = cohorts.find(c => c.id === s.cohort_id);
        const ageHours = s.submitted_date ? Math.floor((Date.now() - new Date(s.submitted_date)) / (1000 * 60 * 60)) : 0;
        return { ...s, student: student ? { full_name: student.full_name } : null, cohort: cohort ? { name: cohort.name } : null, ageHours };
      });

    // --- Oldest pending portfolio (top 10) ---
    const oldestPortfolio = portfolioStatuses
      .filter(ps => ['submitted', 'in_review'].includes(ps.status))
      .sort((a, b) => new Date(a.updated_date) - new Date(b.updated_date))
      .slice(0, 10)
      .map(ps => {
        const student = users.find(u => u.id === ps.user_id);
        const cohort = cohorts.find(c => c.id === ps.cohort_id);
        const template = portfolioTemplates.find(pt => pt.id === ps.portfolio_item_id);
        const ageHours = ps.updated_date ? Math.floor((Date.now() - new Date(ps.updated_date)) / (1000 * 60 * 60)) : 0;
        return { ...ps, student: student ? { full_name: student.full_name } : null, cohort: cohort ? { name: cohort.name } : null, template: template ? { title: template.title } : null, ageHours };
      });

    // --- Tutor workload ---
    const tutorWorkload = users
      .filter(u => u.app_role === 'tutor')
      .map(tutor => {
        const assignedCohortIds = tutorAssignments.filter(ta => ta.tutor_id === tutor.id).map(ta => ta.cohort_id);
        const submissionsWaiting = submissions.filter(s => assignedCohortIds.includes(s.cohort_id) && ['submitted', 'in_review'].includes(s.status)).length;
        const portfolioWaiting = portfolioStatuses.filter(ps => assignedCohortIds.includes(ps.cohort_id) && ['submitted', 'in_review'].includes(ps.status)).length;
        return { tutor: { id: tutor.id, full_name: tutor.full_name }, assignedCount: assignedCohortIds.length, submissionsWaiting, portfolioWaiting, totalWaiting: submissionsWaiting + portfolioWaiting };
      })
      .sort((a, b) => b.totalWaiting - a.totalWaiting);

    // --- Engagement ---
    const today = new Date().toISOString().split('T')[0];
    const loginsToday = loginEvents.filter(le => le.login_time && le.login_time.startsWith(today)).length;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const uniqueUsers = new Set(loginEvents.filter(le => le.login_time && new Date(le.login_time) >= sevenDaysAgo).map(le => le.user_id)).size;

    return Response.json({
      stats: { totalStudents, totalTutors, activeCohorts, pendingSubmissions, pendingPortfolioReviews, completedExams },
      overallLeaderboard,
      cohortLeaderboards,
      cohortHealthData,
      oldestSubmissions,
      oldestPortfolio,
      tutorWorkload,
      engagement: { loginsToday, uniqueUsers },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});