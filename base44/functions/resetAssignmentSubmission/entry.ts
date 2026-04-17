import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const { submissionId } = await req.json();

    if (!submissionId) {
      return Response.json({ error: 'submissionId is required' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Submission.update(submissionId, {
      status: 'draft',
      submitted_date: null,
    });

    await base44.asServiceRole.entities.AdminAuditLog.create({
      action: 'assignment_reset',
      admin_id: user.id,
      admin_name: user.full_name || user.email,
      details: `Submission ${submissionId} reset to draft status.`,
      timestamp: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});