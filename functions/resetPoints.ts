import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Admin-only function to reset all PointsLedger records.
 * Also clears LoginEvent records to prevent stale cached browser code
 * from re-creating daily_login entries (which use today's date as dedup key).
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const db = base44.asServiceRole;

    // Delete all PointsLedger entries
    const allLedger = await db.entities.PointsLedger.list('created_date', 10000);
    let deletedPoints = 0;
    for (const entry of allLedger) {
      await db.entities.PointsLedger.delete(entry.id);
      deletedPoints++;
    }

    // Delete all LoginEvent records so old cached browser code can't bypass dedup
    const allLoginEvents = await db.entities.LoginEvent.list('login_time', 10000);
    let deletedLogins = 0;
    for (const event of allLoginEvents) {
      await db.entities.LoginEvent.delete(event.id);
      deletedLogins++;
    }

    return Response.json({ 
      success: true, 
      deleted_points: deletedPoints,
      deleted_login_events: deletedLogins
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});