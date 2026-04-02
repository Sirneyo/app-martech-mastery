import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, CheckCircle, Loader } from 'lucide-react';

export default function ExamCameraGate({ onPass }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('requesting'); // requesting | ok | denied

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setStatus('ok');
      })
      .catch(() => { if (active) setStatus('denied'); });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleProceed = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    onPass();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}
    >
      {/* Top shimmer */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <Camera className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-300 tracking-widest uppercase">Camera Verification</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
              status === 'ok' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              status === 'denied' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              'bg-slate-700/50 text-slate-400 border border-slate-600/30'
            }`}
          >
            {status === 'requesting' && <><Loader className="w-3 h-3 animate-spin" /> Checking</>}
            {status === 'ok' && <><CheckCircle className="w-3 h-3" /> Ready</>}
            {status === 'denied' && <>Denied</>}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Video */}
      <div className="p-5">
        <div className="relative rounded-xl overflow-hidden mx-auto mb-5 bg-slate-950" style={{ aspectRatio: '4/3', maxWidth: 280 }}>
          {status === 'requesting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader className="w-7 h-7 text-slate-500 animate-spin" />
              <span className="text-xs text-slate-500">Requesting access…</span>
            </div>
          )}
          {status === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <CameraOff className="w-9 h-9 text-slate-600" />
              <p className="text-xs text-slate-400 leading-relaxed">Camera access denied. Please allow camera access in your browser settings and reload.</p>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay muted playsInline
            className={`w-full h-full object-cover transition-opacity duration-500 ${status !== 'ok' ? 'opacity-0' : 'opacity-100'}`}
          />
          {status === 'ok' && (
            <>
              {/* Corner brackets */}
              {['top-2 left-2 border-t border-l', 'top-2 right-2 border-t border-r', 'bottom-2 left-2 border-b border-l', 'bottom-2 right-2 border-b border-r'].map((cls, i) => (
                <div key={i} className={`absolute w-4 h-4 ${cls} border-violet-400/60`} />
              ))}
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-white font-bold tracking-wider">LIVE</span>
              </div>
            </>
          )}
        </div>

        {/* CTA */}
        {status === 'ok' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              Camera confirmed — you may proceed
            </div>
            <button
              onClick={handleProceed}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 24px rgba(109,40,217,0.35)' }}
            >
              Proceed to Begin Exam
            </button>
          </motion.div>
        )}

        {status === 'denied' && (
          <div className="text-center text-xs text-red-400 py-2">
            Camera access is required to sit this exam.
          </div>
        )}
      </div>
    </motion.div>
  );
}