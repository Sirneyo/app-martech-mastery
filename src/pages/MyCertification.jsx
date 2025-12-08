import React, { useState } from 'react';
import { 
  Award, 
  Lock,
  GraduationCap,
  FileText,
  ExternalLink,
  CheckCircle2,
  Download,
  Share2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function MyCertification() {
  const currentWeek = 9; // Would come from user progress
  const isCertificationUnlocked = currentWeek >= 8;
  const [hasPassed, setHasPassed] = useState(false); // Set to true when student passes the exam

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Certification</h1>
        <p className="text-slate-500 mt-1">MarTech Mastery Certification Program</p>
      </motion.div>

      {/* Certification Exam Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`bg-white rounded-2xl p-8 border shadow-sm mb-8 ${
          !isCertificationUnlocked ? 'opacity-60 border-slate-200/50' : 'border-slate-200/50'
        }`}
      >
        <div className="flex items-start gap-6">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            hasPassed ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 
            isCertificationUnlocked ? 'bg-gradient-to-br from-violet-500 to-purple-500' : 
            'bg-slate-100'
          }`}>
            {!isCertificationUnlocked ? (
              <Lock className="w-10 h-10 text-slate-300" />
            ) : hasPassed ? (
              <CheckCircle2 className="w-10 h-10 text-white" />
            ) : (
              <GraduationCap className="w-10 h-10 text-white" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-2xl font-bold text-slate-900">MarTech Mastery Certification Exam</h2>
              {!isCertificationUnlocked && (
                <Badge className="bg-slate-100 text-slate-400">
                  <Lock className="w-3 h-3 mr-1" /> Locked
                </Badge>
              )}
              {isCertificationUnlocked && !hasPassed && (
                <Badge className="bg-violet-100 text-violet-700">Available Now</Badge>
              )}
              {hasPassed && (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Passed
                </Badge>
              )}
            </div>
            <p className="text-slate-600 mb-4 leading-relaxed">
              This happens in <strong>Week 8</strong> of the program where every student must pass the 
              MarTech Mastery Certification Exam. After passing, you'll receive a certification that confirms 
              your status as a <strong>Certified Marketing Operations Professional</strong>.
            </p>
            
            {!isCertificationUnlocked && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" /> 
                  This exam unlocks at <strong>Week 8</strong> of the program. 
                  You are currently in Week {currentWeek}.
                </p>
              </div>
            )}

            {isCertificationUnlocked && !hasPassed && (
              <div className="space-y-4">
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Exam Details</h3>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• 60 minutes to complete</li>
                    <li>• 50 multiple choice questions</li>
                    <li>• 80% passing score required</li>
                    <li>• Covers all 12 weeks of course material</li>
                    <li>• 2 attempts allowed</li>
                  </ul>
                </div>
                <Button 
                  size="lg" 
                  className="bg-violet-600 hover:bg-violet-700"
                  onClick={() => setHasPassed(true)}
                >
                  <GraduationCap className="w-5 h-5 mr-2" />
                  Start Certification Exam
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Certification Display */}
      {hasPassed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 border-4 border-amber-300 rounded-3xl p-12 shadow-xl"
        >
          <div className="text-center">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mb-6 shadow-2xl">
              <Award className="w-16 h-16 text-white" />
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">This certifies that</p>
              <h3 className="text-3xl font-bold text-slate-900 mb-2">
                John Doe
              </h3>
              <p className="text-slate-600 text-lg mb-4">has successfully completed the</p>
              <h4 className="text-2xl font-bold text-amber-600 mb-2">
                MarTech Mastery Certification Program
              </h4>
              <p className="text-slate-700 text-lg">
                and is hereby recognized as a
              </p>
              <h5 className="text-xl font-bold text-slate-900 mt-2">
                Certified Marketing Operations Professional
              </h5>
            </div>

            <div className="flex items-center justify-center gap-4 text-sm text-slate-600 mb-8 pb-8 border-b border-amber-200">
              <div>
                <p className="text-xs text-slate-500 mb-1">Issue Date</p>
                <p className="font-semibold">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div className="w-px h-10 bg-amber-200"></div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Credential ID</p>
                <p className="font-semibold font-mono">MM-{Math.floor(100000 + Math.random() * 900000)}</p>
              </div>
              <div className="w-px h-10 bg-amber-200"></div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Score</p>
                <p className="font-semibold text-green-600">92%</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-3">
              <Button variant="default" className="bg-amber-500 hover:bg-amber-600">
                <Download className="w-4 h-4 mr-2" />
                Download Certificate
              </Button>
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share on LinkedIn
              </Button>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Verify Certificate
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* What You'll Earn Section */}
      {!hasPassed && isCertificationUnlocked && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Official Certification</h3>
            <p className="text-sm text-slate-600">
              Receive an official digital certificate recognizing your expertise in Marketing Operations.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Share2 className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">LinkedIn Badge</h3>
            <p className="text-sm text-slate-600">
              Add your certification to LinkedIn and showcase your skills to potential employers.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Career Advancement</h3>
            <p className="text-sm text-slate-600">
              Stand out in the job market with a recognized certification in MarTech and Marketing Operations.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}