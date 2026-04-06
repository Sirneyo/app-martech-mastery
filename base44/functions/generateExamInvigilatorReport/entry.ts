import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Generates a comprehensive AI invigilator report for a completed exam attempt.
// Compiles all proctoring events, runs AI analysis, and uploads HTML report to Google Drive.

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { attemptId } = await req.json();
  if (!attemptId) return Response.json({ error: 'Missing attemptId' }, { status: 400 });

  // Fetch attempt details
  const attempts = await base44.asServiceRole.entities.ExamAttempt.filter({ id: attemptId });
  const attempt = attempts[0];
  if (!attempt) return Response.json({ error: 'Attempt not found' }, { status: 404 });

  // Fetch all proctoring events for this attempt
  const events = await base44.asServiceRole.entities.ExamProctorEvent.filter({ attempt_id: attemptId });
  const cameraEvents = events.filter(e => e.event_type === 'camera_frame');
  const screenshotEvents = events.filter(e => e.event_type === 'screenshot');
  const violationEvents = events.filter(e => e.event_type === 'violation');

  const totalEvents = events.length;
  const highSuspicionEvents = cameraEvents.filter(e => (e.suspicion_score || 0) >= 50);
  const allFlags = cameraEvents.flatMap(e => e.ai_flags || []);
  const flagCounts = allFlags.reduce((acc, f) => { acc[f] = (acc[f] || 0) + 1; return acc; }, {});
  const avgSuspicion = cameraEvents.length
    ? Math.round(cameraEvents.reduce((sum, e) => sum + (e.suspicion_score || 0), 0) / cameraEvents.length)
    : 0;

  // Overall AI verdict
  const eventSummaries = cameraEvents.slice(0, 20).map((e, i) =>
    `Frame ${i + 1} at ${new Date(e.timestamp).toLocaleTimeString()}: Score=${e.suspicion_score}, Flags=[${(e.ai_flags || []).join(', ')}], Summary="${e.ai_summary}"`
  ).join('\n');

  const verdict = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are an expert AI exam invigilator writing a final integrity report.

Student: ${attempt.student_user_id}
Exam Attempt: ${attemptId}
Duration: ${attempt.started_at ? Math.round((new Date(attempt.submitted_at) - new Date(attempt.started_at)) / 60000) : 'unknown'} minutes
Pass/Fail: ${attempt.pass_flag ? 'PASSED' : 'FAILED'} (${attempt.score_percent}%)

Proctoring Summary:
- Total camera frames analyzed: ${cameraEvents.length}
- Average suspicion score: ${avgSuspicion}/100
- High-suspicion frames (score ≥ 50): ${highSuspicionEvents.length}
- Detected violations: ${violationEvents.length}
- Flags detected: ${JSON.stringify(flagCounts)}
- Screenshots captured: ${screenshotEvents.length}

Frame-by-frame highlights:
${eventSummaries || 'No camera frames analyzed.'}

Write a professional, concise exam integrity report. Include:
1. Overall integrity verdict: CLEAN, SUSPICIOUS, or FLAGGED
2. Key findings (bullet points)
3. Recommended action (no action / review recommended / escalate to human review)
4. Confidence level in your assessment

Be objective and evidence-based. Do not make accusations without supporting evidence from the frames.`,
    response_json_schema: {
      type: 'object',
      properties: {
        verdict: { type: 'string' },
        key_findings: { type: 'array', items: { type: 'string' } },
        recommended_action: { type: 'string' },
        confidence: { type: 'string' },
        narrative: { type: 'string' },
      },
    },
    model: 'claude_sonnet_4_6',
  });

  // Build HTML report
  const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Exam Integrity Report — ${attemptId}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0f1117; color: #e2e8f0; margin: 0; padding: 32px; }
  .container { max-width: 900px; margin: 0 auto; }
  h1 { font-size: 1.8rem; font-weight: 700; color: #fff; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 0.875rem; margin-bottom: 32px; }
  .card { background: #181c25; border: 1px solid #2a2f3d; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
  .label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em; color: #64748b; margin-bottom: 8px; }
  .verdict-clean { color: #34d399; font-size: 1.5rem; font-weight: 800; }
  .verdict-suspicious { color: #fbbf24; font-size: 1.5rem; font-weight: 800; }
  .verdict-flagged { color: #f87171; font-size: 1.5rem; font-weight: 800; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat { background: #0f1117; border: 1px solid #2a2f3d; border-radius: 10px; padding: 16px; text-align: center; }
  .stat-val { font-size: 1.5rem; font-weight: 700; color: #fff; }
  .stat-lbl { font-size: 11px; color: #64748b; margin-top: 4px; }
  .finding { padding: 8px 0; border-bottom: 1px solid #2a2f3d; color: #94a3b8; font-size: 0.875rem; }
  .finding:last-child { border-bottom: none; }
  .finding::before { content: "→ "; color: #6366f1; }
  .event-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 8px; margin-bottom: 6px; background: #0f1117; border: 1px solid #2a2f3d; }
  .score-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
  .score-low { background: rgba(52,211,153,0.1); color: #34d399; border: 1px solid rgba(52,211,153,0.2); }
  .score-med { background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
  .score-high { background: rgba(248,113,113,0.1); color: #f87171; border: 1px solid rgba(248,113,113,0.2); }
  a { color: #818cf8; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="container">
  <h1>Exam Integrity Report</h1>
  <p class="subtitle">Generated ${new Date().toUTCString()} · Attempt ID: ${attemptId}</p>

  <div class="card">
    <div class="label">AI Verdict</div>
    <div class="verdict-${(verdict.verdict || 'clean').toLowerCase()}">${verdict.verdict || 'CLEAN'}</div>
    <p style="color:#94a3b8; margin-top:12px; font-size:0.875rem;">${verdict.narrative || ''}</p>
    <p style="color:#64748b; font-size:0.8rem; margin-top:8px;">Confidence: ${verdict.confidence || 'N/A'} · Recommended Action: ${verdict.recommended_action || 'No action'}</p>
  </div>

  <div class="grid-3">
    <div class="stat"><div class="stat-val">${cameraEvents.length}</div><div class="stat-lbl">Camera Frames</div></div>
    <div class="stat"><div class="stat-val">${avgSuspicion}</div><div class="stat-lbl">Avg Suspicion</div></div>
    <div class="stat"><div class="stat-val">${highSuspicionEvents.length}</div><div class="stat-lbl">High Suspicion Frames</div></div>
  </div>

  ${verdict.key_findings?.length ? `
  <div class="card">
    <div class="label">Key Findings</div>
    ${verdict.key_findings.map(f => `<div class="finding">${f}</div>`).join('')}
  </div>` : ''}

  ${Object.keys(flagCounts).length ? `
  <div class="card">
    <div class="label">Detected Flag Frequencies</div>
    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
      ${Object.entries(flagCounts).map(([flag, count]) => `<span style="background:#1e2535; border:1px solid #2a2f3d; padding:4px 12px; border-radius:8px; font-size:12px; color:#94a3b8;">${flag} ×${count}</span>`).join('')}
    </div>
  </div>` : ''}

  <div class="card">
    <div class="label">Camera Frame Timeline</div>
    <div style="margin-top:12px;">
      ${cameraEvents.map((e, i) => {
        const score = e.suspicion_score || 0;
        const cls = score >= 60 ? 'score-high' : score >= 30 ? 'score-med' : 'score-low';
        return `<div class="event-row">
          <div>
            <span style="color:#fff; font-size:12px; font-weight:600;">Frame ${i + 1}</span>
            <span style="color:#64748b; font-size:11px; margin-left:8px;">${new Date(e.timestamp).toLocaleTimeString()}</span>
            ${e.ai_flags?.length ? `<span style="color:#94a3b8; font-size:11px; margin-left:8px;">${e.ai_flags.join(', ')}</span>` : ''}
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="score-badge ${cls}">${score}/100</span>
            ${e.drive_url ? `<a href="${e.drive_url}" target="_blank" style="font-size:11px;">View ↗</a>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>

  ${screenshotEvents.length ? `
  <div class="card">
    <div class="label">Screen Captures (${screenshotEvents.length})</div>
    <div style="margin-top:12px;">
      ${screenshotEvents.map((e, i) => `
        <div class="event-row">
          <span style="color:#94a3b8; font-size:12px;">Screenshot ${i + 1} · ${new Date(e.timestamp).toLocaleTimeString()}</span>
          ${e.drive_url ? `<a href="${e.drive_url}" target="_blank" style="font-size:11px;">View ↗</a>` : ''}
        </div>`).join('')}
    </div>
  </div>` : ''}

  <p style="color:#2a2f3d; font-size:11px; text-align:center; margin-top:32px;">AI-generated report · MarTech Mastery Certification Platform</p>
</div>
</body>
</html>`;

  // Upload report to Drive
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

  const findOrCreateFolder = async (name, parentId) => {
    const q = `mimeType='application/vnd.google-apps.folder' and name='${name}'${parentId ? ` and '${parentId}' in parents` : ''} and trashed=false`;
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const searchData = await searchRes.json();
    if (searchData.files?.length > 0) return searchData.files[0].id;
    const meta = { name, mimeType: 'application/vnd.google-apps.folder', ...(parentId ? { parents: [parentId] } : {}) };
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(meta),
    });
    return (await createRes.json()).id;
  };

  const rootFolderId = await findOrCreateFolder('ExamProctoring', null);
  const studentFolderId = await findOrCreateFolder(attempts[0]?.student_user_id || 'unknown', rootFolderId);
  const attemptFolderId = await findOrCreateFolder(`attempt_${attemptId.slice(-8)}`, studentFolderId);
  const reportsFolder = await findOrCreateFolder('Reports', attemptFolderId);

  const htmlBytes = new TextEncoder().encode(reportHtml);
  const boundary = '-------report_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  const metaPart = new TextEncoder().encode(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify({ name: `integrity_report_${attemptId.slice(-8)}.html`, parents: [reportsFolder] }) + delimiter + 'Content-Type: text/html\r\n\r\n');
  const closePart = new TextEncoder().encode(closeDelimiter);
  const uploadBody = new Uint8Array(metaPart.length + htmlBytes.length + closePart.length);
  uploadBody.set(metaPart, 0); uploadBody.set(htmlBytes, metaPart.length); uploadBody.set(closePart, metaPart.length + htmlBytes.length);

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: uploadBody,
  });
  const reportFile = await uploadRes.json();

  return Response.json({
    success: true,
    verdict: verdict.verdict,
    avgSuspicion,
    highSuspicionCount: highSuspicionEvents.length,
    reportDriveUrl: reportFile.webViewLink,
    keyFindings: verdict.key_findings,
    recommendedAction: verdict.recommended_action,
  });
});