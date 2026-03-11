import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['admin', 'super_admin'].includes(user.app_role)) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { target_user_id, app_role, status } = await req.json();

        // --- Input Validation ---
        if (!target_user_id || typeof target_user_id !== 'string') {
          return Response.json({ error: 'target_user_id is required' }, { status: 400 });
        }
        const VALID_ROLES = ['student', 'tutor', 'admin', 'super_admin'];
        if (app_role !== undefined && !VALID_ROLES.includes(app_role)) {
          return Response.json({ error: `Invalid app_role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
        }
        const VALID_STATUSES = ['active', 'paused', 'inactive'];
        if (status !== undefined && !VALID_STATUSES.includes(status)) {
          return Response.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
        }
        if (app_role === undefined && status === undefined) {
          return Response.json({ error: 'At least one of app_role or status must be provided' }, { status: 400 });
        }

        const updateData = {};
        if (app_role !== undefined) updateData.app_role = app_role;
        if (status !== undefined) updateData.status = status;

        await base44.asServiceRole.entities.User.update(target_user_id, updateData);

        return Response.json({ success: true, updated: { target_user_id, ...updateData } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});