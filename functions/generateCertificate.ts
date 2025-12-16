import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { certificate_id } = await req.json();

    // Fetch certificate record
    const certificates = await base44.asServiceRole.entities.Certificate.filter({ id: certificate_id });
    if (certificates.length === 0) {
      return Response.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const certificate = certificates[0];

    // Fetch student details
    const students = await base44.asServiceRole.entities.User.filter({ id: certificate.student_user_id });
    const student = students[0];

    // Create PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background gradient effect (using rectangles)
    doc.setFillColor(249, 250, 251);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Load and add company logo
    try {
      const logoResponse = await fetch('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693261f4a46b591b7d38e623/7e47be94a_OADSolutionsRebrand500x200px4.png');
      const logoBlob = await logoResponse.blob();
      const logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(logoBlob);
      });
      doc.addImage(logoBase64, 'PNG', 20, 15, 50, 20);
    } catch (error) {
      console.error('Failed to add logo:', error);
    }

    // Load and add CPD badge
    try {
      const cpdResponse = await fetch('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693261f4a46b591b7d38e623/2ad0e5e09_cpd-certified-logo-circle.png');
      const cpdBlob = await cpdResponse.blob();
      const cpdBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(cpdBlob);
      });
      doc.addImage(cpdBase64, 'PNG', pageWidth - 45, 15, 25, 25);
    } catch (error) {
      console.error('Failed to add CPD badge:', error);
    }

    // Border
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(2);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // Inner border
    doc.setDrawColor(196, 181, 253);
    doc.setLineWidth(0.5);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

    // Title
    doc.setFontSize(32);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('MarTech Mastery', pageWidth / 2, 35, { align: 'center' });

    // Subtitle
    doc.setFontSize(18);
    doc.setTextColor(71, 85, 105);
    doc.text('Professional Certification in Marketing Operations', pageWidth / 2, 45, { align: 'center' });

    // Main body text
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.setFont(undefined, 'normal');
    doc.text('This certifies that', pageWidth / 2, 60, { align: 'center' });

    // Student name
    doc.setFontSize(24);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text(student.full_name, pageWidth / 2, 72, { align: 'center' });

    // Achievement text
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.setFont(undefined, 'normal');
    const achievementText = doc.splitTextToSize(
      'has successfully completed the MarTech Mastery Certification Program and demonstrated practical competence in Marketing Operations.',
      pageWidth - 60
    );
    doc.text(achievementText, pageWidth / 2, 82, { align: 'center' });

    // Framework section
    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    const frameworkText = doc.splitTextToSize(
      'The holder of this certification has been trained using the CADOT™ Framework (Campaign Management & Execution, Analytics & Reporting, Data Management, Operational Activities, and Technology & Stakeholder Management).',
      pageWidth - 60
    );
    doc.text(frameworkText, pageWidth / 2, 95, { align: 'center' });

    // Competencies section
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('They have demonstrated capability in:', pageWidth / 2, 110, { align: 'center' });

    doc.setFont(undefined, 'normal');
    const competencies = [
      '• Campaign management and execution across marketing automation platforms',
      '• Hands-on use of Marketo Engage, including programs, Smart Lists, tokens, and personalisation',
      '• Lead lifecycle management, segmentation, and data governance',
      '• Performance reporting, optimisation, and insight-led decision making',
      '• Operational delivery, QA processes, and stakeholder collaboration'
    ];

    let yPos = 118;
    competencies.forEach(comp => {
      doc.text(comp, 40, yPos);
      yPos += 6;
    });

    // Award requirements
    yPos += 4;
    doc.setFont(undefined, 'bold');
    doc.text('This certification is awarded following:', pageWidth / 2, yPos, { align: 'center' });

    yPos += 8;
    doc.setFont(undefined, 'normal');
    doc.text('• Completion of all required coursework and real-world assignments', 40, yPos);
    yPos += 6;
    doc.text('• Successful assessment of applied Marketing Operations skills', 40, yPos);

    // Footer section
    yPos = pageHeight - 35;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Issued by:', 40, yPos);
    doc.setFont(undefined, 'normal');
    doc.text('MarTech Mastery by OAD Solutions Ltd', 40, yPos + 5);

    const issuedDate = new Date(certificate.issued_at);
    const formattedDate = issuedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    doc.setFont(undefined, 'bold');
    doc.text('Date Awarded:', pageWidth / 2, yPos, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.text(formattedDate, pageWidth / 2, yPos + 5, { align: 'center' });

    doc.setFont(undefined, 'bold');
    doc.text('Certification ID:', pageWidth - 80, yPos, { align: 'left' });
    doc.setFont(undefined, 'normal');
    doc.text(certificate.certificate_id_code, pageWidth - 80, yPos + 5, { align: 'left' });

    // Generate PDF as buffer
    const pdfBytes = doc.output('arraybuffer');
    const fileName = `certificate_${certificate.certificate_id_code}.pdf`;
    
    // Create a File object from the buffer
    const file = new File([pdfBytes], fileName, { type: 'application/pdf' });
    
    // Upload to storage
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: file });
    const certificateUrl = uploadResult.file_url;

    // Update certificate record with URL
    await base44.asServiceRole.entities.Certificate.update(certificate.id, {
      certificate_url: certificateUrl
    });

    return Response.json({ 
      success: true,
      certificate_url: certificateUrl 
    });

  } catch (error) {
    console.error('Certificate generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});