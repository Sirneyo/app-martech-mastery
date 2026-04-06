import React, { useEffect, useRef, useCallback, useState } from 'react';
import { base44 } from '@/api/base44Client';

const SCREENSHOT_INTERVAL_MS = 60_000;  // every 60s
const CAMERA_ANALYSIS_INTERVAL_MS = 45_000; // every 45s

/**
 * Invisible background component that:
 * 1. Captures periodic page screenshots via html2canvas → uploads to Drive
 * 2. Captures webcam frames → AI eye/behavior analysis → uploads to Drive
 * Calls onFlagDetected({ score, flags, summary }) when suspicion is high.
 * Calls onReportReady(reportData) when generateReport() is triggered by parent via ref.
 */
export default function ExamProctorMonitor({ attemptId, cameraStream, onFlagDetected, monitorRef }) {
  const screenshotTimerRef = useRef(null);
  const cameraTimerRef = useRef(null);
  const cameraCanvasRef = useRef(document.createElement('canvas'));
  const activeRef = useRef(true);
  const [status, setStatus] = useState('active'); // active | paused

  const capturePageScreenshot = useCallback(async () => {
    if (!activeRef.current) return;
    try {
      const html2canvas = (await import('https://esm.sh/html2canvas@1.4.1')).default;
      const canvas = await html2canvas(document.body, { scale: 0.5, useCORS: true, logging: false });
      const imageBase64 = canvas.toDataURL('image/png');
      await base44.functions.invoke('uploadExamScreenshot', {
        attemptId,
        imageBase64,
        eventType: 'screenshot',
      });
    } catch (err) {
      console.warn('[Proctor] Screenshot failed:', err.message);
    }
  }, [attemptId]);

  const captureCameraFrame = useCallback(async () => {
    if (!activeRef.current || !cameraStream) return;
    try {
      const video = document.createElement('video');
      video.srcObject = cameraStream;
      await video.play();
      const canvas = cameraCanvasRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      video.srcObject = null;
      const imageBase64 = canvas.toDataURL('image/png');

      const result = await base44.functions.invoke('analyzeExamCameraFrame', {
        attemptId,
        imageBase64,
      });

      if (result?.data?.suspicion_score >= 50 && onFlagDetected) {
        onFlagDetected({
          score: result.data.suspicion_score,
          flags: result.data.flags || [],
          summary: result.data.summary || '',
          severity: result.data.severity || 'medium',
        });
      }
    } catch (err) {
      console.warn('[Proctor] Camera analysis failed:', err.message);
    }
  }, [attemptId, cameraStream, onFlagDetected]);

  // Expose generateReport() to parent via ref
  useEffect(() => {
    if (!monitorRef) return;
    monitorRef.current = {
      generateReport: async () => {
        activeRef.current = false;
        clearInterval(screenshotTimerRef.current);
        clearInterval(cameraTimerRef.current);
        try {
          const result = await base44.functions.invoke('generateExamInvigilatorReport', { attemptId });
          return result?.data;
        } catch (err) {
          console.warn('[Proctor] Report generation failed:', err.message);
          return null;
        }
      },
    };
  }, [attemptId, monitorRef]);

  useEffect(() => {
    activeRef.current = true;

    // Stagger start so we don't fire everything at once
    const screenshotStart = setTimeout(() => {
      capturePageScreenshot();
      screenshotTimerRef.current = setInterval(capturePageScreenshot, SCREENSHOT_INTERVAL_MS);
    }, 5000);

    const cameraStart = setTimeout(() => {
      if (cameraStream) {
        captureCameraFrame();
        cameraTimerRef.current = setInterval(captureCameraFrame, CAMERA_ANALYSIS_INTERVAL_MS);
      }
    }, 15000);

    return () => {
      activeRef.current = false;
      clearTimeout(screenshotStart);
      clearTimeout(cameraStart);
      clearInterval(screenshotTimerRef.current);
      clearInterval(cameraTimerRef.current);
    };
  }, [capturePageScreenshot, captureCameraFrame, cameraStream]);

  // Re-start camera timer when stream becomes available
  useEffect(() => {
    if (!cameraStream) return;
    clearInterval(cameraTimerRef.current);
    cameraTimerRef.current = setInterval(captureCameraFrame, CAMERA_ANALYSIS_INTERVAL_MS);
    return () => clearInterval(cameraTimerRef.current);
  }, [cameraStream, captureCameraFrame]);

  return null; // Invisible component
}