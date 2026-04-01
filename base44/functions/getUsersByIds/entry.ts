import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return Response.json({ users: [] });
    }

    // Fetch all users by IDs using service role (bypasses User list permission)
    const allUsers = await base44.asServiceRole.entities.User.list();
    const filtered = allUsers.filter(u => userIds.includes(u.id));

    return Response.json({ users: filtered });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});