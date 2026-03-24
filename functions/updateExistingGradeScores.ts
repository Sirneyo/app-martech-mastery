import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all grades
    const allGrades = await base44.asServiceRole.entities.SubmissionGrade.list();
    
    // Get all submissions to determine if assignment or project
    const allSubmissions = await base44.asServiceRole.entities.Submission.list();
    const submissionMap = {};
    allSubmissions.forEach(s => {
      submissionMap[s.id] = s;
    });

    let updatedCount = 0;

    for (const grade of allGrades) {
      // Skip if already has score
      if (grade.score !== undefined && grade.score !== null) {
        continue;
      }

      const submission = submissionMap[grade.submission_id];
      if (!submission) continue;

      const isProject = submission.submission_kind === 'project';
      let score = 0;
      const maxScore = 100;

      if (isProject) {
        // Project scoring
        if (grade.rubric_grade === 'Excellent') score = 60;
        else if (grade.rubric_grade === 'Good') score = 40;
      } else {
        // Assignment scoring
        if (grade.rubric_grade === 'Excellent') score = 100;
        else if (grade.rubric_grade === 'Good') score = 50;
        else if (grade.rubric_grade === 'Fair') score = 25;
        else score = 0; // Poor
      }

      await base44.asServiceRole.entities.SubmissionGrade.update(grade.id, {
        score: score,
        max_score: maxScore
      });

      updatedCount++;
    }

    return Response.json({ 
      success: true, 
      message: `Updated ${updatedCount} grades with scores` 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});