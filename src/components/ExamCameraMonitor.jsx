import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { CameraOff, Loader } from 'lucide-react';

/**
 * Live camera feed card shown during the exam.
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

  // Expose checkCamera to parent via ref
  useImperativeHandle(ref, () => ({
    checkCamera: () => {
      if (status === 'live' && streamRef.current?.active) return Promise.resolve(true);
      return startCamera();
    }
  }));

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === 'live' && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
          <span className="text-white text-xs font-semibold tracking-widest">
            {status === 'live' ? 'MONITORED' : status === 'starting' ? 'CONNECTING' : 'OFFLINE'}
          </span>
        </div>
        <span className="text-slate-400 text-[10px] truncate max-w-[120px]">{studentName}</span>
      </div>

      {/* Video */}
      <div className="relative bg-slate-900" style={{ aspectRatio: '4/3' }}>
        {status === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            <Loader className="w-6 h-6 animate-spin" />
          </div>
        )}
        {status === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-2 px-4 text-center">
            <CameraOff className="w-8 h-8" />
            <p className="text-xs text-slate-400">Camera offline</p>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover block ${status !== 'live' ? 'opacity-0' : ''}`}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700">
        <p className="text-[10px] text-slate-400 text-center">
          {status === 'live' ? 'Live monitoring active' : status === 'starting' ? 'Starting camera…' : 'Camera access required'}
        </p>
      </div>
    </div>
  );
});

export default ExamCameraMonitor;