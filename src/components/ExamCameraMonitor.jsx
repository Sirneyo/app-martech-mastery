import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { CameraOff, Loader, Wifi } from 'lucide-react';

/**
 * Sleek live camera feed card shown during the exam.
 * Ref methods: checkCamera() → Promise<boolean>
 */
const ExamCameraMonitor = forwardRef(function ExamCameraMonitor({ studentName }, ref) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('starting'); // starting | live | denied

  const startCamera = () => {
    setStatus('starting');
    return navigator.mediaDevices
      .getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setStatus('live');
        return true;
      })
      .catch(() => {
        setStatus('denied');
        return false;
      });
  };

  useEffect(() => {
    startCamera();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  useImperativeHandle(ref, () => ({
    checkCamera: () => {
      if (status === 'live' && streamRef.current?.active) return Promise.resolve(true);
      return startCamera();
    }
  }));

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900 shadow-lg">
      {/* Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center gap-1.5">
          {status === 'live' ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399] animate-pulse" />
              <span className="text-emerald-400 text-[9px] font-bold tracking-widest uppercase">Live</span>
            </>
          ) : status === 'starting' ? (
            <>
              <Loader className="w-2.5 h-2.5 text-slate-400 animate-spin" />
              <span className="text-slate-400 text-[9px] font-semibold tracking-widest uppercase">Connecting</span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-red-400 text-[9px] font-bold tracking-widest uppercase">Offline</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <Wifi className="w-2.5 h-2.5" />
          <span className="text-[9px] font-medium">PROCTORED</span>
        </div>
      </div>

      {/* Video */}
      <div className="relative bg-slate-950" style={{ aspectRatio: '4/3' }}>
        {/* Scan line overlay for "monitored" feel */}
        {status === 'live' && (
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
            }}
          />
        )}

        {status === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-slate-600 border-t-emerald-400 rounded-full animate-spin" />
            </div>
          </div>
        )}
        {status === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-2 px-4 text-center">
            <CameraOff className="w-7 h-7 opacity-60" />
            <p className="text-[10px] text-slate-500 leading-snug">Camera access<br />unavailable</p>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover block transition-opacity duration-500 ${status !== 'live' ? 'opacity-0' : 'opacity-100'}`}
        />

        {/* Corner brackets */}
        {status === 'live' && (
          <>
            <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-emerald-400/60 z-20" />
            <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t border-r border-emerald-400/60 z-20" />
            <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b border-l border-emerald-400/60 z-20" />
            <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-emerald-400/60 z-20" />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-700/50">
        <p className="text-[9px] text-slate-500 text-center font-medium tracking-wide truncate">
          {studentName ? studentName.toUpperCase() : 'CANDIDATE'}
        </p>
      </div>
    </div>
  );
});

export default ExamCameraMonitor;