import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Uploads a base64 screenshot to Google Drive under ExamProctoring/{studentName}/{attemptId}/
// and stores a record in ExamProctorEvent entity.

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { attemptId, imageBase64, mimeType = 'image/png', eventType = 'screenshot' } = await req.json();
  if (!attemptId || !imageBase64) return Response.json({ error: 'Missing required fields' }, { status: 400 });

  const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

  // --- Ensure folder hierarchy: ExamProctoring > studentName > attemptId ---
  const findOrCreateFolder = async (name, parentId) => {
    const q = `mimeType='application/vnd.google-apps.folder' and name='${name}'${parentId ? ` and '${parentId}' in parents` : ''} and trashed=false`;
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) return searchData.files[0].id;

    const meta = { name, mimeType: 'application/vnd.google-apps.folder', ...(parentId ? { parents: [parentId] } : {}) };
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(meta),
    });
    const folder = await createRes.json();
    return folder.id;
  };

  const rootFolderId = await findOrCreateFolder('ExamProctoring', null);
  const studentFolderId = await findOrCreateFolder(user.full_name || user.email, rootFolderId);
  const attemptFolderId = await findOrCreateFolder(`attempt_${attemptId.slice(-8)}`, studentFolderId);

  // --- Upload screenshot via multipart ---
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${eventType}_${timestamp}.png`;
  const fileMetadata = JSON.stringify({ name: fileName, parents: [attemptFolderId] });
  const imageBytes = Uint8Array.from(atob(imageBase64.replace(/^data:image\/\w+;base64,/, '')), c => c.charCodeAt(0));

  const boundary = '-------exam_proctor_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const encoder = new TextEncoder();
  const metaPart = encoder.encode(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + fileMetadata + delimiter + `Content-Type: ${mimeType}\r\n\r\n`);
  const closePart = encoder.encode(closeDelimiter);

  const body = new Uint8Array(metaPart.length + imageBytes.length + closePart.length);
  body.set(metaPart, 0);
  body.set(imageBytes, metaPart.length);
  body.set(closePart, metaPart.length + imageBytes.length);

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  const uploaded = await uploadRes.json();
  if (!uploaded.id) return Response.json({ error: 'Drive upload failed', detail: uploaded }, { status: 500 });

  // --- Store proctoring event ---
  const event = await base44.asServiceRole.entities.ExamProctorEvent.create({
    attempt_id: attemptId,
    student_user_id: user.id,
    student_name: user.full_name || user.email,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    drive_file_id: uploaded.id,
    drive_url: uploaded.webViewLink,
  });

  return Response.json({ success: true, eventId: event.id, driveUrl: uploaded.webViewLink });
});