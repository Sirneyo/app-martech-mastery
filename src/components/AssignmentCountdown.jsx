import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

/**
 * Counts down to the unlock time for a given assignment week.
 * Unlock: Saturday 12:00pm (noon) of the week it's released
 * The unlock Saturday is: cohortStartSaturday + (weekNumber - 1) * 7 days
 */
export function getAssignmentDates(cohortStartDate, weekNumber) {
  // Find the first Saturday on or after the cohort start date
  const start = new Date(cohortStartDate);
  start.setHours(0, 0, 0, 0);
  const dayOfWeek = start.getDay(); // 0=Sun, 6=Sat
  const daysUntilSaturday = dayOfWeek === 6 ? 0 : (6 - dayOfWeek);
  
  const firstSaturday = new Date(start);
  firstSaturday.setDate(start.getDate() + daysUntilSaturday);
  
  // Unlock: Saturday of that week at 12:00 noon (local)
  const unlockDate = new Date(firstSaturday);
  unlockDate.setDate(firstSaturday.getDate() + (weekNumber - 1) * 7);
  unlockDate.setHours(12, 0, 0, 0);
  
  // Due: following Friday at 22:00 (10pm local)
  const dueDate = new Date(unlockDate);
  dueDate.setDate(unlockDate.getDate() + 6); // next Friday
  dueDate.setHours(22, 0, 0, 0);
  
  return { unlockDate, dueDate };
}

export default function AssignmentCountdown({ unlockDate }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const calc = () => {
      const diff = unlockDate - new Date();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [unlockDate]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
      <Clock className="w-3.5 h-3.5 text-amber-500" />
      <span className="text-amber-600 font-medium">
        Unlocks in{' '}
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {timeLeft.hours > 0 && `${timeLeft.hours}h `}
        {timeLeft.minutes}m {timeLeft.seconds}s
      </span>
    </div>
  );
}