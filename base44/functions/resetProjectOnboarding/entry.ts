import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const realUser = await base44.auth.me();

    if (!realUser || realUser.app_role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { userId } = body;

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    await base44.asServiceRole.entities.User.update(userId, {
      opsbase_agreement_signed: false,
      opsbase_agreement_signed_at: null,
    });

    await base44.asServiceRole.entities.AdminAuditLog.create({
      action: 'attempt_reset',
      admin_id: realUser.id,
      admin_name: realUser.full_name || realUser.email,
      target_user_id: userId,
      details: 'Project onboarding agreement reset. Student will be shown the agreement screen again on next visit.',
      timestamp: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});