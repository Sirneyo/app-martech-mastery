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

    // Fetch each user in parallel instead of listing all users
    const results = await Promise.all(
      userIds.map(id =>
        base44.asServiceRole.entities.User.filter({ id }).then(r => r[0]).catch(() => null)
      )
    );

    const users = results.filter(Boolean);
    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});