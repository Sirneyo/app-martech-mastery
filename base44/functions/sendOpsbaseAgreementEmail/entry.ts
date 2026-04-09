import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const reqClone = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: JSON.stringify(body),
    });
    const base44 = createClientFromRequest(reqClone);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { studentName, studentEmail, date, cohortName, pdfBase64 } = body;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MarTech Mastery <noreply@app.martech-mastery.com>',
        to: [studentEmail],
        subject: 'Your Opsbase Project Experience Agreement',
        html: `<p>Dear ${studentName},</p>
<p>Thank you for signing the Opsbase Project Experience Agreement as part of the MarTech Mastery programme.</p>
<p>Please find your signed agreement attached to this email for your records.</p>
<p><strong>Date:</strong> ${date}<br/><strong>Programme Cohort:</strong> ${cohortName}</p>
<p>If you have any questions, please contact your programme coordinator.</p>
<p>Best regards,<br/>MarTech Mastery by OAD Solutions Ltd</p>`,
        attachments: [
          {
            filename: 'Opsbase_Project_Experience_Agreement.pdf',
            content: pdfBase64,
          },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to send email');

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});