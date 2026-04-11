import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, ArrowRight, RotateCcw, PenLine, Type, X, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { jsPDF } from 'jspdf';

const AGREEMENT_SECTIONS = [
  {
    heading: null,
    body: 'By accessing the Opsbase project materials on the MarTech Mastery learning platform, you agree to the following terms.',
  },
  {
    heading: '1. Confidentiality',
    body: 'All project briefs, data, and materials provided to you are proprietary and confidential. You must not share, reproduce, or distribute any project content outside of the MarTech Mastery programme. This applies indefinitely.\n\nYou may state on your CV and in interviews that you completed real projects through Opsbase. You may not disclose specific project details, client names, or deliverable content.',
  },
  {
    heading: '2. How Your Work Is Assessed',
    body: 'Your project deliverables are reviewed by the MarTech Mastery team against criteria agreed with Opsbase. If your work does not meet the required standard, you will receive feedback and be expected to revise and resubmit within the timeframe provided.\n\nTo pass, your work must:\na) Address all requirements in the project brief\nb) Be technically accurate and functional\nc) Be clearly documented and professionally organised\nd) Follow any naming conventions specified in the brief\ne) Be your own work (AI tools may be used to assist, but the thinking and decisions must be yours)',
  },
  {
    heading: '3. CV Entitlement',
    body: 'If you satisfactorily complete all assigned projects, you may reference the Opsbase project experience on your CV and professional profiles. MarTech Mastery and Opsbase may provide references to prospective employers at their discretion.\n\nIf you do not complete the projects to a satisfactory standard, you may not reference Opsbase or the project experience professionally.',
  },
  {
    heading: '4. Intellectual Property',
    body: 'All project materials remain the property of Opsbase and/or their clients. Work you produce during the projects may be used by Opsbase or MarTech Mastery for internal purposes. You may not claim ownership of or commercialise any project deliverables.',
  },
  {
    heading: '5. Breach',
    body: 'Breaching any term of this agreement may result in your CV entitlement being revoked and further action where appropriate.',
  },
];

function SignaturePad({ onSignatureChange }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const [mode, setMode] = useState('draw');
  const [typedSig, setTypedSig] = useState('');
  const [hasDrawing, setHasDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawing(true);
    onSignatureChange(canvas.toDataURL());
  };

  const stopDraw = (e) => { e?.preventDefault(); isDrawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
    onSignatureChange(null);
  };

  const handleTypedChange = (val) => {
    setTypedSig(val);
    if (!val) { onSignatureChange(null); return; }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'italic 36px Georgia, serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(val, 16, 52);
    onSignatureChange(canvas.toDataURL());
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => { setMode('draw'); clearCanvas(); setTypedSig(''); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${mode === 'draw' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
        >
          <PenLine className="w-3.5 h-3.5" /> Draw
        </button>
        <button
          onClick={() => { setMode('type'); clearCanvas(); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${mode === 'type' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
        >
          <Type className="w-3.5 h-3.5" /> Type
        </button>
      </div>

      {mode === 'type' ? (
        <input
          type="text"
          value={typedSig}
          onChange={(e) => handleTypedChange(e.target.value)}
          placeholder="Type your name or initials…"
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-2xl italic font-serif text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          style={{ fontFamily: 'Georgia, serif' }}
        />
      ) : (
        <div className="relative border border-slate-200 rounded-xl bg-slate-50 overflow-hidden" style={{ touchAction: 'none' }}>
          <canvas
            ref={canvasRef}
            width={600}
            height={120}
            className="w-full cursor-crosshair block"
            style={{ height: '120px' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          {!hasDrawing && (
            <p className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm pointer-events-none select-none">
              Draw your signature here
            </p>
          )}
        </div>
      )}

      {hasDrawing && mode === 'draw' && (
        <button onClick={clearCanvas} className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
          <RotateCcw className="w-3 h-3" /> Clear
        </button>
      )}
    </div>
  );
}

export default function OpsbaseAgreementStep({ user, cohortName, onContinue }) {
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [studentName, setStudentName] = useState(user?.display_name || '');
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const validate = () => {
    const errs = {};
    if (!studentName.trim()) errs.name = 'Please enter your name.';
    if (!signatureDataUrl) errs.sig = 'Please provide your signature.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 60;
      const contentW = pageW - margin * 2;
      let y = 60;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(27, 43, 94);
      doc.text('OPSBASE PROJECT EXPERIENCE AGREEMENT', pageW / 2, y, { align: 'center' });
      y += 20;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(240, 90, 34);
      doc.text('MarTech Mastery by OAD Solutions Ltd', pageW / 2, y, { align: 'center' });
      y += 24;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 20;

      for (const section of AGREEMENT_SECTIONS) {
        if (section.heading) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(240, 90, 34);
          doc.text(section.heading, margin, y);
          y += 16;
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        const lines = doc.splitTextToSize(section.body, contentW);
        if (y + lines.length * 14 > 780) { doc.addPage(); y = 60; }
        doc.text(lines, margin, y);
        y += lines.length * 14 + 12;
      }

      y += 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 20;

      const fields = [
        { label: 'Student Name', value: studentName },
        { label: 'Date', value: today },
        { label: 'Programme Cohort', value: cohortName || 'N/A' },
      ];
      for (const f of fields) {
        if (y > 750) { doc.addPage(); y = 60; }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(f.label, margin, y);
        y += 14;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(f.value, margin, y);
        y += 8;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageW - margin, y);
        y += 18;
      }

      if (y > 700) { doc.addPage(); y = 60; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Signature', margin, y);
      y += 10;
      doc.addImage(signatureDataUrl, 'PNG', margin, y, 200, 50);
      y += 60;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 20;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('MarTech Mastery is operated by OAD Solutions Ltd. This agreement forms part of the programme terms and conditions.', pageW / 2, y, { align: 'center' });

      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const pdfBlob = doc.output('blob');

      // Upload PDF and send email in parallel
      const [uploadResult] = await Promise.all([
        base44.integrations.Core.UploadFile({ file: pdfBlob }),
        base44.functions.invoke('sendOpsbaseAgreementEmail', {
          studentName,
          studentEmail: user.email,
          date: today,
          cohortName: cohortName || 'N/A',
          pdfBase64,
        }),
      ]);

      // Save agreement status via backend (service role)
      await base44.functions.invoke('saveOpsbaseAgreement', {
        pdfUrl: uploadResult.file_url,
      });

      setShowSuccessModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-4">
                <FileText className="w-3.5 h-3.5" />
                Participation Agreement
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Before You Begin</h1>
              <p className="text-slate-500 text-base max-w-xl mx-auto">
                Please read through the participation agreement carefully and sign below.
              </p>
            </div>

            {/* Document card — click to open */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Documents Required</span>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="w-full flex items-center gap-4 px-6 py-5 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-teal-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-teal-700 transition-colors">Opsbase Project Experience Agreement</p>
                  <p className="text-xs text-slate-400 mt-0.5">MarTech Mastery by OAD Solutions Ltd</p>
                </div>
                <span className="text-xs font-semibold text-teal-600 flex items-center gap-1 flex-shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" /> Click to view &amp; sign
                </span>
              </button>
            </div>

          </motion.div>
        </div>
      </div>

      {/* Success Confirmation Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="px-8 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Agreement Signed Successfully</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Your agreement has been signed successfully. A copy has been sent to your email address and saved to your profile documents.
              </p>
            </div>
            <div className="px-8 pb-8">
              <Button
                className="w-full h-11 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
                onClick={() => { setShowSuccessModal(false); onContinue(); }}
              >
                Got it — View My Projects
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal with full contract + signature fields */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Opsbase Project Experience Agreement</span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Agreement heading */}
              <div className="px-8 py-6 border-b border-slate-100 text-center">
                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Opsbase Project Experience Agreement</h2>
                <p className="text-sm font-semibold mt-1" style={{ color: '#F05A22' }}>MarTech Mastery by OAD Solutions Ltd</p>
              </div>

              {/* Agreement body */}
              <div className="px-8 py-6 space-y-5 border-b border-slate-100">
                {AGREEMENT_SECTIONS.map((section, i) => (
                  <div key={i}>
                    {section.heading && (
                      <p className="text-sm font-bold mb-1.5" style={{ color: '#F05A22' }}>{section.heading}</p>
                    )}
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{section.body}</p>
                  </div>
                ))}
              </div>

              {/* Signature fields */}
              <div className="px-8 py-6 space-y-5 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-3">Sign Below</p>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Student Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => { setStudentName(e.target.value); setErrors(p => ({ ...p, name: null })); }}
                    placeholder="Enter your full name"
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.name ? 'border-red-300' : 'border-slate-200'}`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input type="text" value={today} readOnly className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-500 bg-white cursor-default" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Programme Cohort</label>
                  <input type="text" value={cohortName || 'Loading…'} readOnly className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-500 bg-white cursor-default" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Signature <span className="text-red-500">*</span>
                  </label>
                  <SignaturePad onSignatureChange={(data) => { setSignatureDataUrl(data); setErrors(p => ({ ...p, sig: null })); }} />
                  {errors.sig && <p className="text-red-500 text-xs mt-1">{errors.sig}</p>}
                </div>

                <p className="text-xs text-slate-400 text-center pt-2 border-t border-slate-200">
                  MarTech Mastery is operated by OAD Solutions Ltd. This agreement forms part of the programme terms and conditions.
                </p>
              </div>
            </div>

            {/* Submit footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <Button
                className="w-full h-11 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl disabled:opacity-60"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'I Agree — View My Projects'}
                {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}