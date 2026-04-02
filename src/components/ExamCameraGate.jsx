import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff, CheckCircle, XCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Camera gate shown on the Ready page.
 * Props:
 *   onPass  — called when camera confirmed working
 *   onFail  — called when camera access denied
 */
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
    // Stop the gate stream — the attempt page will open its own
    streamRef.current?.getTracks().forEach(t => t.stop());
    onPass();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden"
    >
      <div className="bg-slate-900 px-6 py-4 flex items-center gap-3">
        <Camera className="w-5 h-5 text-white" />
        <h2 className="text-white font-semibold text-sm tracking-wide">CAMERA VERIFICATION</h2>
        <div className={`ml-auto flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
          ${status === 'ok' ? 'bg-emerald-500 text-white' : status === 'denied' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
          {status === 'requesting' && <><Loader className="w-3 h-3 animate-spin" /> Checking</>}
          {status === 'ok' && <><CheckCircle className="w-3 h-3" /> Camera Ready</>}
          {status === 'denied' && <><XCircle className="w-3 h-3" /> Access Denied</>}
        </div>
      </div>

      <div className="p-6">
        {/* Video preview */}
        <div className="relative rounded-xl overflow-hidden bg-slate-900 mb-5" style={{ aspectRatio: '4/3', maxWidth: 320, margin: '0 auto 20px' }}>
          {status === 'requesting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader className="w-8 h-8 animate-spin" />
              <span className="text-xs">Requesting access…</span>
            </div>
          )}
          {status === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-3 px-6 text-center">
              <CameraOff className="w-10 h-10" />
              <p className="text-sm font-medium text-slate-300">Camera access was denied.</p>
              <p className="text-xs text-slate-400">Please allow camera access in your browser settings and reload the page.</p>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${status !== 'ok' ? 'opacity-0' : ''}`}
            style={{ display: 'block' }}
          />
          {status === 'ok' && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white text-[10px] font-semibold tracking-wide">LIVE</span>
            </div>
          )}
        </div>

        {status === 'ok' && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Camera confirmed — you may begin
            </div>
            <Button
              onClick={handleProceed}
              size="lg"
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-base py-5"
            >
              Proceed to Begin Exam
            </Button>
          </div>
        )}

        {status === 'denied' && (
          <div className="flex items-center gap-2 justify-center text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-lg text-sm font-medium">
            <XCircle className="w-4 h-4" />
            You cannot start the exam without camera access.
          </div>
        )}
      </div>
    </motion.div>
  );
}