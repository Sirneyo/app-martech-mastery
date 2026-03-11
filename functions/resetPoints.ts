import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = base44.asServiceRole;

    // Delete PointsLedger records one at a time to avoid rate limits
    const ledgerRecords = await db.entities.PointsLedger.list('created_date', 500);
    for (const record of ledgerRecords) {
      await db.entities.PointsLedger.delete(record.id);
    }

    return Response.json({ 
      success: true, 
      deleted_points: ledgerRecords.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});