import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.app_role !== 'super_admin') {
            return Response.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
        }

        const { userId } = await req.json();

        if (!userId) {
            return Response.json({ error: 'userId is required' }, { status: 400 });
        }

        await base44.asServiceRole.entities.User.delete(userId);

        return Response.json({ success: true, deletedUserId: userId });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});