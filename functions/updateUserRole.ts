import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { target_user_id, app_role } = await req.json();

        await base44.asServiceRole.entities.User.update(target_user_id, { app_role });

        return Response.json({ success: true, updated: { target_user_id, app_role } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});