import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'super_admin'].includes(user.app_role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = base44.asServiceRole;
    const payload = await req.json().catch(() => ({}));
    const { userId } = payload;

    // If userId provided, reset only that user's points; otherwise reset all
    const ledgerRecords = userId
      ? await db.entities.PointsLedger.filter({ user_id: userId })
      : await db.entities.PointsLedger.list('created_date', 500);

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