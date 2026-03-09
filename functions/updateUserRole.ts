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

        const updateData = {};
        if (app_role !== undefined) updateData.app_role = app_role;
        if (status !== undefined) updateData.status = status;

        await base44.asServiceRole.entities.User.update(target_user_id, updateData);

        return Response.json({ success: true, updated: { target_user_id, ...updateData } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});