import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Analyzes a webcam frame with AI for eye contact, multiple faces, phone/device detection, etc.
// Updates the ExamProctorEvent with AI findings.

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { attemptId, imageBase64 } = await req.json();
  if (!attemptId || !imageBase64) return Response.json({ error: 'Missing required fields' }, { status: 400 });

  const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

  // Upload camera frame to Drive
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
  const studentFolderId = await findOrCreateFolder(user.full_name || user.email, rootFolderId);
  const attemptFolderId = await findOrCreateFolder(`attempt_${attemptId.slice(-8)}`, studentFolderId);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `camera_${timestamp}.png`;
  const fileMetadata = JSON.stringify({ name: fileName, parents: [attemptFolderId] });
  const imageBytes = Uint8Array.from(atob(imageBase64.replace(/^data:image\/\w+;base64,/, '')), c => c.charCodeAt(0));
  const boundary = '-------exam_camera_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  const encoder = new TextEncoder();
  const metaPart = encoder.encode(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + fileMetadata + delimiter + 'Content-Type: image/png\r\n\r\n');
  const closePart = encoder.encode(closeDelimiter);
  const body = new Uint8Array(metaPart.length + imageBytes.length + closePart.length);
  body.set(metaPart, 0); body.set(imageBytes, metaPart.length); body.set(closePart, metaPart.length + imageBytes.length);

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  const uploaded = await uploadRes.json();

  // AI analysis of camera frame
  const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are an expert AI exam invigilator. Analyze this webcam capture from a student taking a proctored certification exam.

Check for the following violations and suspicious behaviors:
1. Looking away from screen (eyes not directed at screen)
2. Looking down (at phone/notes)
3. Multiple faces visible in frame
4. No face visible (student left)
5. Phone or device visible
6. Paper/notes visible
7. Someone else present or whispering
8. Suspicious hand movements

Respond ONLY in this exact JSON format:
{
  "suspicion_score": <0-100>,
  "flags": ["looking_away", "phone_detected", ...],
  "summary": "<one concise sentence describing what you see>",
  "severity": "low" | "medium" | "high"
}

If everything looks normal and the student appears to be genuinely focused on the exam, suspicion_score should be 0-15 and flags should be empty.`,
    file_urls: [imageBase64],
    response_json_schema: {
      type: 'object',
      properties: {
        suspicion_score: { type: 'number' },
        flags: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
        severity: { type: 'string' },
      },
    },
    model: 'claude_sonnet_4_6',
  });

  // Store event
  const event = await base44.asServiceRole.entities.ExamProctorEvent.create({
    attempt_id: attemptId,
    student_user_id: user.id,
    student_name: user.full_name || user.email,
    event_type: 'camera_frame',
    timestamp: new Date().toISOString(),
    drive_file_id: uploaded.id || null,
    drive_url: uploaded.webViewLink || null,
    ai_flags: analysis.flags || [],
    ai_summary: analysis.summary || '',
    suspicion_score: Math.round(analysis.suspicion_score || 0),
  });

  return Response.json({
    eventId: event.id,
    suspicion_score: analysis.suspicion_score,
    flags: analysis.flags,
    summary: analysis.summary,
    severity: analysis.severity,
  });
});