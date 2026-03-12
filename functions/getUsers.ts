import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const allowedRoles = ['admin', 'super_admin', 'tutor'];
        if (!allowedRoles.includes(user.app_role)) {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const rawUsers = await base44.asServiceRole.entities.User.list();
        const users = rawUsers.map(u => ({ ...u, full_name: u.display_name || u.full_name || '' }));

        return Response.json({ users });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});