import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlayCircle, ChevronRight } from 'lucide-react';

const TABS = [
  { key: 'video1', label: 'Project Introduction', desc: 'Partnership overview & project scope' },
  { key: 'video2', label: 'Dashboard Tutorial', desc: 'How to navigate your project workspace' },
];

export default function OnboardingRewatchModal({ isOpen, onClose, introVideoUrl, dashboardVideoUrl }) {
  const [activeTab, setActiveTab] = useState('video1');
  const currentUrl = activeTab === 'video1' ? introVideoUrl : dashboardVideoUrl;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Onboarding Videos</h2>
                <p className="text-xs text-slate-400 mt-0.5">Rewatch your project introduction materials</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-100">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-4 py-3 text-left transition-colors border-b-2 ${activeTab === tab.key ? 'border-teal-500 bg-teal-50/50' : 'border-transparent hover:bg-slate-50'}`}
                >
                  <p className={`text-sm font-semibold ${activeTab === tab.key ? 'text-teal-700' : 'text-slate-600'}`}>{tab.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{tab.desc}</p>
                </button>
              ))}
            </div>

            <div className="p-4">
              {currentUrl ? (
                <div className="relative w-full rounded-xl overflow-hidden bg-slate-900" style={{ paddingTop: '56.25%' }}>
                  <iframe src={currentUrl} className="absolute inset-0 w-full h-full" allowFullScreen title="Onboarding Video" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl py-16 border border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-3">
                    <PlayCircle className="w-6 h-6 text-teal-400" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Video coming soon</p>
                  <p className="text-slate-300 text-xs mt-1">Your coordinator will add this shortly</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}