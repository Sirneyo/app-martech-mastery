import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role for admin operations
    const db = base44.asServiceRole;

    // Fetch and delete PointsLedger in batches
    let totalDeletedPoints = 0;
    let totalDeletedLogins = 0;

    const ledgerBatch = await db.entities.PointsLedger.list('created_date', 500);
    await Promise.all(ledgerBatch.map(e => db.entities.PointsLedger.delete(e.id)));
    totalDeletedPoints = ledgerBatch.length;

    // Delete LoginEvents too so old cached browser code can't bypass dedup and re-create daily_login entries
    const loginBatch = await db.entities.LoginEvent.list('login_time', 500);
    await Promise.all(loginBatch.map(e => db.entities.LoginEvent.delete(e.id)));
    totalDeletedLogins = loginBatch.length;

    return Response.json({ 
      success: true, 
      deleted_points: totalDeletedPoints,
      deleted_login_events: totalDeletedLogins
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});