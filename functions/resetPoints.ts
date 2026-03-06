import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = base44.asServiceRole;

    const allLedger = await db.entities.PointsLedger.list('created_date', 10000);
    for (const entry of allLedger) {
      await db.entities.PointsLedger.delete(entry.id);
    }

    const allLoginEvents = await db.entities.LoginEvent.list('login_time', 10000);
    for (const event of allLoginEvents) {
      await db.entities.LoginEvent.delete(event.id);
    }

    return Response.json({ 
      success: true, 
      deleted_points: allLedger.length,
      deleted_login_events: allLoginEvents.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});