import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const tasks = await base44.asServiceRole.entities.ProjectTask.list();
  const phases = await base44.asServiceRole.entities.ProjectPhase.list();
  const phaseIds = new Set(phases.map(p => p.id));

  const orphaned = tasks.filter(t => t.phase_id && !phaseIds.has(t.phase_id));

  return Response.json({ 
    total_tasks: tasks.length,
    total_phases: phases.length,
    phase_ids: [...phaseIds],
    orphaned_count: orphaned.length,
    orphaned: orphaned.map(t => ({ id: t.id, title: t.title, phase_id: t.phase_id }))
  });
});