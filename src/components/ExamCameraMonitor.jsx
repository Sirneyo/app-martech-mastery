import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, Camera, CameraOff, Eye, AlertTriangle, X } from 'lucide-react';

export default function ExamCameraMonitor({ attemptId, studentName, onViolation }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [phase, setPhase] = useState('requesting'); // requesting | capturing | active | denied
  const [violations, setViolations] = useState([]);
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [minimised, setMinimised] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  // Start camera
  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setPhase('capturing');
      })
      .catch(() => {
        if (active) setPhase('denied');
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(dataUrl);
    setPhase('active');
  }, []);

  const triggerViolation = useCallback((type, message) => {
    const entry = { type, message, time: new Date().toISOString() };
    setViolations(prev => [...prev, entry]);
    setWarningMessage(message);
    setShowWarningBanner(true);
    onViolation?.(entry);
    setTimeout(() => setShowWarningBanner(false), 6000);
  }, [onViolation]);

  // Tab / focus detection
  useEffect(() => {
    if (phase !== 'active') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('tab_switch', 'Tab switch detected — this has been logged.');
      }
    };

    const handleBlur = () => {
      triggerViolation('focus_loss', 'Browser focus lost — this has been logged.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [phase, triggerViolation]);

  const violationCount = violations.length;
  const isCompromised = violationCount >= 3;

  return (
    <>
      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Monitored session badge — top bar */}
      <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-1.5 text-xs font-semibold tracking-wide gap-2
        ${isCompromised ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
        {isCompromised ? (
          <><ShieldAlert className="w-3.5 h-3.5" /> SESSION FLAGGED — {violationCount} VIOLATION{violationCount > 1 ? 'S' : ''} RECORDED</>
        ) : (
          <><Shield className="w-3.5 h-3.5" /> MONITORED SESSION {violationCount > 0 ? `· ${violationCount} warning${violationCount > 1 ? 's' : ''}` : '· Active'}</>
        )}
      </div>

      {/* Warning banner */}
      <AnimatePresence>
        {showWarningBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-md"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Integrity Warning</p>
              <p className="text-xs opacity-90">{warningMessage}</p>
            </div>
            <button onClick={() => setShowWarningBanner(false)} className="ml-2 opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating camera feed */}
      <motion.div
        drag
        dragMomentum={false}
        className="fixed bottom-6 right-6 z-50 select-none"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className={`rounded-2xl overflow-hidden shadow-2xl border-2 ${isCompromised ? 'border-red-500' : 'border-emerald-500'} bg-slate-900`}
          style={{ width: minimised ? 48 : 200 }}>

          {/* Header bar */}
          <div className={`flex items-center justify-between px-2 py-1.5 ${isCompromised ? 'bg-red-600' : 'bg-emerald-600'}`}>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {!minimised && <span className="text-white text-[10px] font-bold tracking-wide">LIVE</span>}
            </div>
            <button onClick={() => setMinimised(p => !p)} className="text-white/80 hover:text-white">
              {minimised ? <Eye className="w-3 h-3" /> : <CameraOff className="w-3 h-3" />}
            </button>
          </div>

          {!minimised && (
            <>
              {/* Camera phase: requesting */}
              {phase === 'requesting' && (
                <div className="flex flex-col items-center justify-center h-36 text-slate-400 gap-2 p-3">
                  <Camera className="w-6 h-6 animate-pulse" />
                  <span className="text-[10px] text-center">Requesting camera...</span>
                </div>
              )}

              {/* Camera phase: capturing — show live feed + capture button */}
              {phase === 'capturing' && (
                <div className="relative">
                  <video ref={videoRef} className="w-full block" autoPlay muted playsInline style={{ height: 150, objectFit: 'cover' }} />
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-3 bg-gradient-to-t from-black/60">
                    <button
                      onClick={capturePhoto}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-lg shadow"
                    >
                      Verify Face
                    </button>
                  </div>
                </div>
              )}

              {/* Camera phase: active — show live feed */}
              {phase === 'active' && (
                <video ref={videoRef} className="w-full block" autoPlay muted playsInline style={{ height: 150, objectFit: 'cover' }} />
              )}

              {/* Camera denied */}
              {phase === 'denied' && (
                <div className="flex flex-col items-center justify-center h-36 text-red-400 gap-2 p-3">
                  <CameraOff className="w-6 h-6" />
                  <span className="text-[10px] text-center text-slate-300">Camera access denied</span>
                </div>
              )}

              {/* Footer */}
              <div className="px-2 py-1.5 bg-slate-800 flex items-center justify-between">
                <span className="text-slate-400 text-[9px] truncate max-w-[110px]">{studentName || 'Candidate'}</span>
                {violationCount > 0 && (
                  <span className="text-red-400 text-[9px] font-bold">{violationCount} flag{violationCount > 1 ? 's' : ''}</span>
                )}
              </div>
            </>
          )}
        </div>
        {!minimised && (
          <p className="text-center text-slate-400 text-[9px] mt-1 select-none">Drag to move</p>
        )}
      </motion.div>
    </>
  );
}