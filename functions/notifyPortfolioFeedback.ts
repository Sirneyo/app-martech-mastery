import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Entity automation - fires when PortfolioItemStatus is updated.
 * Creates an in-app notification for feedback / approval / revision.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload;
    const db = base44.asServiceRole;

    if (!data || event.type !== 'update') return Response.json({ skipped: 'not an update event' });

    const newStatus = data.status;
    const oldStatus = old_data?.status;

    if (newStatus === oldStatus) return Response.json({ skipped: 'status unchanged' });

    const relevantStatuses = ['approved', 'needs_revision'];
    if (!relevantStatuses.includes(newStatus)) return Response.json({ skipped: `status '${newStatus}' not notifiable` });

    const studentId = data.user_id;
    if (!studentId) return Response.json({ skipped: 'no user_id' });

    // Get portfolio item title
    let itemTitle = 'a portfolio item';
    if (data.portfolio_item_id) {
      const templates = await db.entities.PortfolioItemTemplate.filter({ id: data.portfolio_item_id });
      if (templates.length) itemTitle = templates[0].title;
    }

    const isApproved = newStatus === 'approved';

    await db.entities.Notification.create({
      user_id: studentId,
      type: isApproved ? 'portfolio_approved' : 'portfolio_needs_revision',
      title: isApproved ? `✅ Portfolio Item Approved` : `📝 Revision Needed`,
      message: isApproved
        ? `"${itemTitle}" has been approved. Great work!`
        : `"${itemTitle}" needs revision. ${data.reviewer_note ? data.reviewer_note : 'Tap to view feedback.'}`,
      link_url: `/StudentPortfolio`,
      related_entity_id: event.entity_id,
    });

    return Response.json({ success: true, type: newStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});