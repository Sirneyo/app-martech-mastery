import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.app_role !== 'super_admin') {
    return Response.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
  }

  const checkStart = Date.now();
  const results = {
    checked_at: new Date().toISOString(),
    checks: {
      database: [],
      email: [],
      secrets: [],
      security: [],
      data_consistency: [],
      notifications: [],
      automations: [],
    },
    summary: { pass: 0, warn: 0, fail: 0 },
    duration_ms: 0,
  };

  const addCheck = (category, name, status, message, details = null) => {
    results.checks[category].push({ name, status, message, details });
    results.summary[status] = (results.summary[status] || 0) + 1;
  };

  // ─────────────────────────────────────────────────────────────
  // 1. SECRETS / ENVIRONMENT VARIABLES
  // ─────────────────────────────────────────────────────────────
  const requiredSecrets = ['RESEND_API_KEY', 'BASE44_API_URL', 'BASE44_APP_URL', 'BASE44_APP_ID'];
  for (const secretName of requiredSecrets) {
    const value = Deno.env.get(secretName);
    if (!value) {
      addCheck('secrets', secretName, 'fail', 'Not configured — environment variable is missing');
    } else {
      addCheck('secrets', secretName, 'pass', 'Configured ✓');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. EMAIL SERVICE CHECK (Resend)
  // ─────────────────────────────────────────────────────────────
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    addCheck('email', 'Resend API Key', 'fail', 'RESEND_API_KEY is not configured');
    addCheck('email', 'Resend Connectivity', 'fail', 'Cannot test — API key missing');
  } else {
    addCheck('email', 'Resend API Key', 'pass', 'API key is configured ✓');

    // Check API connectivity via domains endpoint
    try {
      const resendRes = await fetch('https://api.resend.com/domains', {
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      });
      if (resendRes.ok) {
        const resendData = await resendRes.json();
        addCheck('email', 'Resend API Connectivity', 'pass', 'Successfully authenticated with Resend', {
          domains_configured: resendData?.data?.length ?? 0,
        });
      } else if (resendRes.status === 401) {
        addCheck('email', 'Resend API Connectivity', 'fail', 'Invalid API key — authentication rejected by Resend');
      } else {
        addCheck('email', 'Resend API Connectivity', 'warn', `Resend API returned HTTP ${resendRes.status}`);
      }
    } catch (emailError) {
      addCheck('email', 'Resend API Connectivity', 'fail', `Cannot reach Resend service: ${emailError.message}`);
    }

    // Send a real test email to verify full delivery pipeline
    try {
      const testEmailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'System Check <support@app.martech-mastery.com>',
          to: ['niyi@oadsolutions.com'],
          subject: `✅ System Check — Email Delivery Test (${new Date().toUTCString()})`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(30,45,90,0.10);">
              <div style="background: #9dc6f0; padding: 32px 40px; text-align: center;">
                <img src="https://res.cloudinary.com/dbckozv27/image/upload/v1773184292/Full_logo_w5hurk.png" alt="MarTech Mastery" style="max-width: 150px; height: auto; display: block; margin: 0 auto;" />
              </div>
              <div style="padding: 40px 40px 32px;">
                <h2 style="color:#1e293b; margin-bottom: 8px;">System Health Check ✅</h2>
                <p style="color:#475569; margin-bottom: 16px;">This is an automated test email sent by the Super Admin System Check to verify that the email delivery pipeline is fully operational.</p>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:20px; margin:20px 0;">
                  <p style="margin:0; color:#64748b; font-size:14px; text-transform: uppercase; letter-spacing: 0.05em;">Check Details</p>
                  <p style="margin:12px 0 0; font-size:14px; color:#475569;">
                    <strong>Checked at:</strong> ${new Date().toUTCString()}<br/>
                    <strong>Recipient:</strong> niyi@oadsolutions.com<br/>
                    <strong>Service:</strong> Resend<br/>
                    <strong>Status:</strong> ✅ Delivered successfully
                  </p>
                </div>
                <p style="color:#94a3b8; font-size:12px; margin-top:24px;">You can safely ignore this email — it was triggered by a routine system health check.</p>
              </div>
              <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px; text-align: center;">
                <p style="color: #cbd5e1; font-size: 11px; margin: 0;">© MarTech Mastery by OAD Solutions</p>
              </div>
            </div>
          `,
        }),
      });

      if (testEmailRes.ok) {
        const testEmailData = await testEmailRes.json();
        addCheck('email', 'Test Email Delivery', 'pass',
          'Test email successfully sent to niyi@oadsolutions.com ✓',
          { message_id: testEmailData?.id || 'n/a', recipient: 'niyi@oadsolutions.com' }
        );
      } else {
        const errBody = await testEmailRes.json().catch(() => ({}));
        addCheck('email', 'Test Email Delivery', 'fail',
          `Failed to send test email — Resend returned HTTP ${testEmailRes.status}`,
          { error: errBody?.message || 'Unknown error', status: testEmailRes.status }
        );
      }
    } catch (sendError) {
      addCheck('email', 'Test Email Delivery', 'fail', `Test email send failed: ${sendError.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. DATABASE + ENTITY COUNTS
  // ─────────────────────────────────────────────────────────────
  try {
    const [
      users, cohorts, submissions, loginEvents, notifications,
      supportTickets, ledgerEntries, memberships, submissionGrades
    ] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 1000),
      base44.asServiceRole.entities.Cohort.list('-created_date', 100),
      base44.asServiceRole.entities.Submission.list('-created_date', 1000),
      base44.asServiceRole.entities.LoginEvent.list('-login_time', 500),
      base44.asServiceRole.entities.Notification.list('-created_date', 200),
      base44.asServiceRole.entities.SupportTicket.list('-created_date', 200),
      base44.asServiceRole.entities.PointsLedger.list('-created_date', 500),
      base44.asServiceRole.entities.CohortMembership.list('-created_date', 1000),
      base44.asServiceRole.entities.SubmissionGrade.list('-created_date', 200),
    ]);

    // ── Database connectivity
    addCheck('database', 'Database Connectivity', 'pass', 'All entity collections queried successfully');

    // ── User breakdown
    const students = users.filter(u => u.app_role === 'student');
    const tutors = users.filter(u => u.app_role === 'tutor');
    const admins = users.filter(u => ['admin', 'super_admin'].includes(u.app_role));
    addCheck('database', 'User Records', 'pass', `${users.length} total users in system`, {
      students: students.length,
      tutors: tutors.length,
      admins: admins.length,
    });

    // ── Cohorts
    const activeCohorts = cohorts.filter(c => c.status === 'active');
    addCheck('database', 'Cohorts', 'pass',
      `${cohorts.length} total cohort(s) — ${activeCohorts.length} active`,
      { upcoming: cohorts.filter(c => c.status === 'upcoming').length, active: activeCohorts.length, completed: cohorts.filter(c => c.status === 'completed').length }
    );

    // ── Submissions
    const pendingReview = submissions.filter(s => s.status === 'submitted' || s.status === 'in_review');
    addCheck('database', 'Submissions', pendingReview.length > 50 ? 'warn' : 'pass',
      `${submissions.length} total — ${pendingReview.length} awaiting review`,
      { total: submissions.length, pending_review: pendingReview.length, graded: submissions.filter(s => s.status === 'graded').length }
    );

    // ── Support Tickets
    const openTickets = supportTickets.filter(t => t.status === 'open');
    addCheck('database', 'Support Tickets',
      openTickets.length > 20 ? 'warn' : 'pass',
      `${openTickets.length} open ticket(s) of ${supportTickets.length} total`,
      { open: openTickets.length, in_progress: supportTickets.filter(t => t.status === 'in_progress').length, resolved: supportTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length }
    );

    // ─────────────────────────────────────────────────────────────
    // 4. SECURITY: LOGIN EVENT ANALYSIS
    // ─────────────────────────────────────────────────────────────
    const now = Date.now();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const recent24h = loginEvents.filter(e => new Date(e.login_time) > last24h);
    const recent7d = loginEvents.filter(e => new Date(e.login_time) > last7d);

    addCheck('security', 'Login Activity (24h)', 'pass', `${recent24h.length} login events in the last 24 hours`);
    addCheck('security', 'Login Activity (7 days)', 'pass', `${recent7d.length} login events in the last 7 days`);

    // IP frequency analysis — flag IPs with unusually high login count
    const ipCounts24h = recent24h.reduce((acc, e) => {
      if (e.ip_address) acc[e.ip_address] = (acc[e.ip_address] || 0) + 1;
      return acc;
    }, {});
    const suspiciousIPs = Object.entries(ipCounts24h)
      .filter(([, count]) => count > 15)
      .sort((a, b) => b[1] - a[1])
      .map(([ip, count]) => ({ ip, count }));

    if (suspiciousIPs.length > 0) {
      addCheck('security', 'Suspicious IP Activity', 'warn',
        `${suspiciousIPs.length} IP(s) with >15 logins in 24 hours — review recommended`,
        { suspicious_ips: suspiciousIPs.slice(0, 10) }
      );
    } else {
      addCheck('security', 'Suspicious IP Activity', 'pass', 'No unusual IP login patterns detected');
    }

    // Unique IPs over 7 days
    const uniqueIPs7d = new Set(recent7d.filter(e => e.ip_address).map(e => e.ip_address)).size;
    addCheck('security', 'Unique IPs (7 days)', 'pass', `${uniqueIPs7d} distinct IP addresses logged in the past week`);

    // Top IPs
    const ipCounts7d = recent7d.reduce((acc, e) => {
      if (e.ip_address) acc[e.ip_address] = (acc[e.ip_address] || 0) + 1;
      return acc;
    }, {});
    const topIPs = Object.entries(ipCounts7d).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([ip, count]) => ({ ip, count }));
    addCheck('security', 'Top Login IPs (7 days)', 'pass', `Most active login IPs this week`, { top_ips: topIPs });

    // Most recent login
    if (loginEvents[0]) {
      addCheck('security', 'Last Login Event', 'pass',
        `Most recent login: ${new Date(loginEvents[0].login_time).toUTCString()}`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 5. DATA CONSISTENCY
    // ─────────────────────────────────────────────────────────────
    // Submissions missing cohort_id
    const submissionsNoCohort = submissions.filter(s => !s.cohort_id);
    addCheck('data_consistency', 'Submission Cohort References',
      submissionsNoCohort.length > 5 ? 'warn' : 'pass',
      submissionsNoCohort.length === 0
        ? 'All submissions have cohort IDs ✓'
        : `${submissionsNoCohort.length} submission(s) missing cohort ID`
    );

    // Stale open support tickets (> 7 days old)
    const staleTickets = supportTickets.filter(t => t.status === 'open' && new Date(t.created_date) < last7d);
    addCheck('data_consistency', 'Stale Support Tickets',
      staleTickets.length > 0 ? 'warn' : 'pass',
      staleTickets.length === 0
        ? 'No open tickets older than 7 days ✓'
        : `${staleTickets.length} open ticket(s) have not been actioned in over 7 days`
    );

    // Active cohorts without active members
    const cohortsNoMembers = activeCohorts.filter(c =>
      !memberships.some(m => m.cohort_id === c.id && m.status === 'active')
    );
    addCheck('data_consistency', 'Active Cohorts Have Members',
      cohortsNoMembers.length > 0 ? 'warn' : 'pass',
      cohortsNoMembers.length === 0
        ? 'All active cohorts have at least one member ✓'
        : `${cohortsNoMembers.length} active cohort(s) have no active members`,
      cohortsNoMembers.length > 0 ? { empty_cohorts: cohortsNoMembers.map(c => c.name) } : null
    );

    // Submissions with no grades for >7 days in submitted status
    const longPendingSubmissions = submissions.filter(s =>
      (s.status === 'submitted' || s.status === 'in_review') &&
      new Date(s.submitted_date || s.created_date) < last7d
    );
    addCheck('data_consistency', 'Long-Pending Submissions',
      longPendingSubmissions.length > 10 ? 'warn' : 'pass',
      longPendingSubmissions.length === 0
        ? 'No submissions pending >7 days ✓'
        : `${longPendingSubmissions.length} submission(s) ungraded for over 7 days`
    );

    // ─────────────────────────────────────────────────────────────
    // 6. NOTIFICATION SYSTEM
    // ─────────────────────────────────────────────────────────────
    addCheck('notifications', 'Notification Records', 'pass',
      `${notifications.length} total notifications in system`
    );
    const notifs24h = notifications.filter(n => new Date(n.created_date) > last24h);
    addCheck('notifications', 'Recent Notifications (24h)',
      notifs24h.length === 0 ? 'warn' : 'pass',
      notifs24h.length === 0
        ? 'No notifications generated in the last 24 hours — system may be quiet or automation may not be firing'
        : `${notifs24h.length} notifications generated in the last 24 hours`
    );
    const unreadNotifications = notifications.filter(n => !n.is_read);
    addCheck('notifications', 'Unread Notifications',
      unreadNotifications.length > 100 ? 'warn' : 'pass',
      `${unreadNotifications.length} unread notification(s) across all users`
    );

    // ─────────────────────────────────────────────────────────────
    // 7. AUTOMATION EVIDENCE CHECKS
    // ─────────────────────────────────────────────────────────────
    // Evidence-based checks — infer automation health from recent entity activity
    const ledger24h = ledgerEntries.filter(e => new Date(e.created_date) > last24h);
    addCheck('automations', 'Points Processing Pipeline',
      'pass',
      `${ledgerEntries.length} total points events — ${ledger24h.length} in last 24h`
    );

    const gradesLast7d = submissionGrades.filter(g => new Date(g.created_date) > last7d);
    addCheck('automations', 'Grading Automation',
      'pass',
      `${submissionGrades.length} total grades — ${gradesLast7d.length} in the last 7 days`
    );

    // Check if login streak automation has generated points recently
    const streakPoints = ledgerEntries.filter(e =>
      e.reason && (e.reason.toLowerCase().includes('streak') || e.reason.toLowerCase().includes('login')) &&
      new Date(e.created_date) > last7d
    );
    addCheck('automations', 'Login Streak Automation',
      streakPoints.length > 0 ? 'pass' : 'warn',
      streakPoints.length > 0
        ? `Login streak automation has fired ${streakPoints.length} time(s) this week`
        : 'No login streak points recorded in the past 7 days — check if automation is active'
    );

    // Check notification automation
    const gradeNotifs7d = notifications.filter(n =>
      (n.type === 'assignment_graded' || n.type === 'points_awarded') &&
      new Date(n.created_date) > last7d
    );
    addCheck('automations', 'Grade & Points Notification Automation',
      'pass',
      `${gradeNotifs7d.length} grade/points notifications fired in the last 7 days`
    );

  } catch (dbError) {
    addCheck('database', 'Database Connectivity', 'fail', `Database query failed: ${dbError.message}`);
  }

  results.duration_ms = Date.now() - checkStart;
  return Response.json(results);
});