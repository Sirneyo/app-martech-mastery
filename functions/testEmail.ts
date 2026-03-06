import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'MarTech Mastery',
      to: email,
      subject: 'Test Email from MarTech Mastery',
      body: '<h1>Test Email</h1><p>If you received this, your email configuration is working!</p>',
    });

    return Response.json({ success: true, message: 'Test email sent' });
  } catch (error) {
    console.error('Test email error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});