import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { pdfBase64 } = body;

    let pdfUrl = null;

    if (pdfBase64) {
      // Convert base64 to binary and upload server-side
      const binaryStr = atob(pdfBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const pdfBlob = new Blob([bytes], { type: 'application/pdf' });

      const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfBlob });
      pdfUrl = uploadResult.file_url;
    }

    const currentDocs = user.portfolio_documents || [];
    const updatedDocs = pdfUrl && !currentDocs.includes(pdfUrl)
      ? [...currentDocs, pdfUrl]
      : currentDocs;

    await base44.asServiceRole.entities.User.update(user.id, {
      opsbase_agreement_signed: true,
      opsbase_agreement_signed_at: new Date().toISOString(),
      opsbase_agreement_pdf_url: pdfUrl || null,
      portfolio_documents: updatedDocs,
    });

    return Response.json({ success: true, pdfUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});