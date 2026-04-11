import React, { useState, useEffect, useCallback } from 'react';
import OnboardingRewatchModal from '@/components/client-project/OnboardingRewatchModal';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, MapPin, BookOpen } from 'lucide-react';

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Your Project 👋',
    description: "This is your real-world project workspace. Here you'll complete tasks for an actual client, build your portfolio, and gain hands-on experience you can put on your CV.",
    target: '[data-tour="project-header"]',
    position: 'bottom',
  },
  {
    id: 'progress',
    title: 'Track Your Progress',
    description: "The progress bar shows how many tasks you've completed and had approved. Keep an eye on this — your goal is to reach 100% by the project deadline.",
    target: '[data-tour="progress-area"]',
    position: 'bottom',
  },
  {
    id: 'kanban',
    title: 'Your Kanban Board',
    description: "All your tasks are laid out in columns by status: To Do, In Progress, In Review, and Approved. Work through them left to right as you complete each piece of work.",
    target: '[data-tour="kanban-board"]',
    position: 'top',
  },
  {
    id: 'task-cards',
    title: 'Task Cards',
    description: "Each card is a task assigned to you. You can see the task name, which project phase it belongs to, its priority level, and how many subtasks are involved.",
    target: '[data-tour="kanban-board"]',
    position: 'top',
  },
  {
    id: 'drag-drop',
    title: 'Drag & Drop Tasks',
    description: "Move tasks between columns by dragging and dropping them. When you start working, drag the task to 'In Progress', then to 'In Review' once you've submitted your deliverable.",
    target: '[data-tour="kanban-board"]',
    position: 'top',
  },
  {
    id: 'task-detail',
    title: 'Open a Task for the Full Brief',
    description: "Click on any task card to open the full assignment brief. Inside you'll find instructions, deliverable requirements, reference files, and the submission area — all in one place.",
    target: '[data-tour="kanban-board"]',
    position: 'top',
  },
  {
    id: 'phases',
    title: 'Project Phases',
    description: "Tasks are grouped into phases like Campaign, Analytics, and Data Management. Each phase builds on the last, so try to complete them in order for the best project outcome.",
    target: '[data-tour="kanban-board"]',
    position: 'top',
  },
  {
    id: 'finish',
    title: "You're All Set! 🚀",
    description: "You now know everything you need to get started. Dive in, complete your tasks phase by phase, and don't hesitate to reach out to your tutor if you get stuck. Good luck!",
    target: '[data-tour="project-header"]',
    position: 'bottom',
  },
];

function getElementRect(selector) {
  if (!selector) return null;
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    };
  } catch {
    return null;
  }
}

function SpotlightOverlay({ rect, padding = 12 }) {
  if (!rect) return <div className="fixed inset-0 bg-black/60 z-[9998]" />;

  const top = rect.top - padding;
  const left = rect.left - padding;
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;

  return (
    <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: 'none' }}>
      <svg width="100%" height="100%" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={left}
              y={top}
              width={width}
              height={height}
              rx={12}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#spotlight-mask)"
        />
        <rect
          x={left}
          y={top}
          width={width}
          height={height}
          rx={12}
          fill="none"
          stroke="rgba(20,184,166,0.8)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

function TourCard({ step, stepIndex, totalSteps, onNext, onSkip, rect }) {
  const isLast = stepIndex === totalSteps - 1;
  const padding = 12;

  // Calculate card position
  let cardStyle = {};
  const cardWidth = 340;
  const cardApproxHeight = 180;
  const margin = 16;

  if (rect) {
    const spotTop = rect.top - padding;
    const spotBottom = rect.top + rect.height + padding;
    const spotLeft = rect.left - padding;
    const spotRight = rect.left + rect.width + padding;
    const centerX = rect.left + rect.width / 2;

    if (step.position === 'bottom') {
      cardStyle = {
        position: 'fixed',
        top: Math.min(spotBottom + margin, window.innerHeight - cardApproxHeight - margin) - window.scrollY + rect.top - rect.top,
        left: Math.max(margin, Math.min(centerX - cardWidth / 2, window.innerWidth - cardWidth - margin)),
      };
      // Use fixed positioning relative to viewport
      const viewportBottom = rect.top - window.scrollY + rect.height + padding + margin;
      cardStyle = {
        position: 'fixed',
        top: Math.min(viewportBottom, window.innerHeight - cardApproxHeight - margin),
        left: Math.max(margin, Math.min(centerX - cardWidth / 2, window.innerWidth - cardWidth - margin)),
      };
    } else {
      // position above
      const viewportTop = rect.top - window.scrollY - padding - cardApproxHeight - margin;
      cardStyle = {
        position: 'fixed',
        top: Math.max(margin, viewportTop),
        left: Math.max(margin, Math.min(centerX - cardWidth / 2, window.innerWidth - cardWidth - margin)),
      };
    }
  } else {
    // Center fallback
    cardStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  return (
    <motion.div
      key={stepIndex}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ ...cardStyle, zIndex: 9999, width: cardWidth }}
      className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900 leading-snug">{step.title}</h3>
          <button
            onClick={onSkip}
            className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mt-2">{step.description}</p>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
        <span className="text-xs text-slate-400 font-medium">Step {stepIndex + 1} of {totalSteps}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={onSkip}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip Tour
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {isLast ? "Let's Go!" : 'Next'}
            {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Step dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === stepIndex ? 'bg-teal-500' : 'bg-slate-200'}`}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function ProjectOnboardingTour({ userId, projectId, onDone, introVideoUrl, dashboardVideoUrl }) {
  const storageKey = `tour_done_project_${userId}`;
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [rewatchOpen, setRewatchOpen] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(storageKey);
    if (!done) {
      // Small delay so page elements render first
      const t = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  const updateRect = useCallback((step) => {
    const r = getElementRect(step.target);
    setRect(r);
    if (r) {
      // Scroll element into view
      const el = document.querySelector(step.target);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  useEffect(() => {
    if (active) {
      updateRect(TOUR_STEPS[stepIndex]);
    }
  }, [active, stepIndex, updateRect]);

  const handleNext = () => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex(i => i + 1);
    } else {
      finish();
    }
  };

  const finish = () => {
    localStorage.setItem(storageKey, 'true');
    setActive(false);
    onDone?.();
  };

  const restart = () => {
    setStepIndex(0);
    setActive(true);
  };

  if (!active) {
    return (
      <>
        <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">
          <button
            onClick={() => setRewatchOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 shadow-md text-slate-600 hover:text-teal-700 hover:border-teal-300 text-xs font-semibold px-3 py-2 rounded-full transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Rewatch Onboarding
          </button>
          <button
            onClick={restart}
            title="Replay onboarding tour"
            className="flex items-center gap-2 bg-white border border-slate-200 shadow-md text-slate-600 hover:text-teal-700 hover:border-teal-300 text-xs font-semibold px-3 py-2 rounded-full transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
            Take the Tour
          </button>
        </div>
        <OnboardingRewatchModal
          isOpen={rewatchOpen}
          onClose={() => setRewatchOpen(false)}
          introVideoUrl={introVideoUrl}
          dashboardVideoUrl={dashboardVideoUrl}
        />
      </>
    );
  }

  return (
    <>
      <SpotlightOverlay rect={rect} />
      <AnimatePresence mode="wait">
        <TourCard
          key={stepIndex}
          step={TOUR_STEPS[stepIndex]}
          stepIndex={stepIndex}
          totalSteps={TOUR_STEPS.length}
          onNext={handleNext}
          onSkip={finish}
          rect={rect}
        />
      </AnimatePresence>
    </>
  );
}