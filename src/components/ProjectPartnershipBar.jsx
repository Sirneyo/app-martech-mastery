import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';

const MARTECH_LOGO = 'https://storage.googleapis.com/msgsndr/DVqsiywKVWkfZ4I0mXQ1/media/693348610439b8283bf88818.svg';
const OPSBASE_LOGO = 'https://media.base44.com/images/public/693261f4a46b591b7d38e623/6610419bc_5e2c44538_OpsbaseLogo500x100px.png';

export default function ProjectPartnershipBar({ showBack = false, backTo = 'StudentSimProjects' }) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-[57px] z-30 bg-white border-b border-slate-200">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Back arrow only — no text */}
        <div className="w-10">
          {showBack && (
            <button
              onClick={() => navigate(createPageUrl(backTo))}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Centered logos — bolder / larger */}
        <div className="flex items-center gap-4">
          <img src={MARTECH_LOGO} alt="MarTech Mastery" className="h-7 w-auto" />
          <div className="flex items-center gap-3">
            <div className="w-px h-5 bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In partnership with</span>
            <div className="w-px h-5 bg-slate-200" />
          </div>
          <img src={OPSBASE_LOGO} alt="Opsbase" className="h-7 w-auto" />
        </div>

        {/* Spacer */}
        <div className="w-10" />
      </div>
    </div>
  );
}