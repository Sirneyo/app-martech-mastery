import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cohortId } = await req.json();

    if (!cohortId) {
      return Response.json({ error: 'cohortId is required' }, { status: 400 });
    }

    // Get memberships and tutor assignments for this cohort
    const memberships = await base44.entities.CohortMembership.filter({ cohort_id: cohortId });
    const tutorAssignments = await base44.entities.TutorCohortAssignment.filter({ cohort_id: cohortId });

    const studentUserIds = [...new Set(memberships.map(m => m.user_id).filter(Boolean))];
    const tutorUserIds = [...new Set(tutorAssignments.map(t => t.tutor_id).filter(Boolean))];

    // Use service role to fetch user data
    const allUsers = await base44.asServiceRole.entities.User.list();
    const students = allUsers.filter(u => studentUserIds.includes(u.id));
    const tutors = allUsers.filter(u => tutorUserIds.includes(u.id));
    const availableStudents = allUsers.filter(u => u.app_role === 'student' && !studentUserIds.includes(u.id));
    const availableTutors = allUsers.filter(u => u.app_role === 'tutor' && !tutorUserIds.includes(u.id));

    return Response.json({ 
      students, 
      tutors,
      availableStudents,
      availableTutors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});