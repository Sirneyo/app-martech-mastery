import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const realUser = await base44.auth.me();
    if (!realUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Support super admin impersonation
    const body = await req.json().catch(() => ({}));
    let tutorId = realUser.id;
    if (body.impersonateUserId && realUser.app_role === 'super_admin') {
      tutorId = body.impersonateUserId;
    }

    // Get tutor's cohort assignments (always use service role so super admin impersonation works)
    const tutorAssignments = await base44.asServiceRole.entities.TutorCohortAssignment.filter({ tutor_id: tutorId });
    if (tutorAssignments.length === 0) {
      return Response.json({ pending: { assignments: 0, projects: 0, portfolio: 0 }, cohortIds: [] });
    }
    const cohortIds = tutorAssignments.map(a => a.cohort_id);

    // Get memberships for tutor's cohorts only
    const allMemberships = await base44.asServiceRole.entities.CohortMembership.filter({ status: 'active' });
    const cohortMemberships = allMemberships.filter(m => cohortIds.includes(m.cohort_id));
    const studentIds = [...new Set(cohortMemberships.map(m => m.user_id))];

    if (studentIds.length === 0) {
      return Response.json({ pending: { assignments: 0, projects: 0, portfolio: 0 } });
    }

    // Fetch submissions and portfolio statuses in parallel
    const [assignmentSubs, projectSubs, portfolioItems] = await Promise.all([
      base44.asServiceRole.entities.Submission.filter({ submission_kind: 'assignment' }),
      base44.asServiceRole.entities.Submission.filter({ submission_kind: 'project' }),
      base44.asServiceRole.entities.PortfolioItemStatus.filter({ status: 'submitted' }),
    ]);

    const pendingAssignments = assignmentSubs.filter(s =>
      studentIds.includes(s.user_id) && ['submitted', 'in_review'].includes(s.status)
    ).length;

    const pendingProjects = projectSubs.filter(s =>
      studentIds.includes(s.user_id) && ['submitted', 'in_review'].includes(s.status)
    ).length;

    const pendingPortfolio = portfolioItems.filter(i =>
      studentIds.includes(i.user_id) && cohortIds.includes(i.cohort_id)
    ).length;

    return Response.json({
      pending: {
        assignments: pendingAssignments,
        projects: pendingProjects,
        portfolio: pendingPortfolio,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});