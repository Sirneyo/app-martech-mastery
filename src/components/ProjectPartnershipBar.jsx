import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';

const MARTECH_LOGO = 'https://storage.googleapis.com/msgsndr/DVqsiywKVWkfZ4I0mXQ1/media/693348610439b8283bf88818.svg';
const OPSBASE_LOGO = 'https://media.base44.com/images/public/693261f4a46b591b7d38e623/6610419bc_5e2c44538_OpsbaseLogo500x100px.png';

export default function ProjectPartnershipBar({ showBack = false, backLabel = 'Back to Projects', backTo = 'StudentSimProjects' }) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="px-6 py-2.5 flex items-center justify-between">
        {/* Back arrow */}
        <div className="w-32">
          {showBack && (
            <button
              onClick={() => navigate(createPageUrl(backTo))}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{backLabel}</span>
            </button>
          )}
        </div>

        {/* Centered logos */}
        <div className="flex items-center gap-5">
          <img src={MARTECH_LOGO} alt="MarTech Mastery" className="h-6 w-auto" />
          <div className="flex items-center gap-3">
            <div className="w-px h-5 bg-slate-200" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">In partnership with</span>
            <div className="w-px h-5 bg-slate-200" />
          </div>
          <img src={OPSBASE_LOGO} alt="Opsbase" className="h-6 w-auto" />
        </div>

        {/* Spacer to balance the back button */}
        <div className="w-32" />
      </div>
    </div>
  );
}