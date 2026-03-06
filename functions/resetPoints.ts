import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function deleteBatch(db, entityName, records) {
  for (const record of records) {
    await db.entities[entityName].delete(record.id);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = base44.asServiceRole;

    // Delete PointsLedger records sequentially
    const ledgerRecords = await db.entities.PointsLedger.list('created_date', 500);
    await deleteBatch(db, 'PointsLedger', ledgerRecords);

    // Delete LoginEvent records sequentially
    const loginRecords = await db.entities.LoginEvent.list('login_time', 500);
    await deleteBatch(db, 'LoginEvent', loginRecords);

    return Response.json({ 
      success: true, 
      deleted_points: ledgerRecords.length,
      deleted_login_events: loginRecords.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});