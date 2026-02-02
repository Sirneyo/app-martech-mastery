import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tutor's cohort assignments
    const assignments = await base44.entities.TutorCohortAssignment.filter({
      tutor_id: user.id
    });

    if (assignments.length === 0) {
      return Response.json({ students: [] });
    }

    const cohortIds = assignments.map(a => a.cohort_id);

    // Get memberships for tutor's cohorts
    const allMemberships = await base44.entities.CohortMembership.list();
    const memberships = allMemberships.filter(m => 
      cohortIds.includes(m.cohort_id) && m.status === 'active'
    );

    const studentUserIds = [...new Set(memberships.map(m => m.user_id).filter(Boolean))];

    if (studentUserIds.length === 0) {
      return Response.json({ students: [] });
    }

    // Use service role to fetch student data
    const allUsers = await base44.asServiceRole.entities.User.list();
    const students = allUsers.filter(u => studentUserIds.includes(u.id));

    return Response.json({ students });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});