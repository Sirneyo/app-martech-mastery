import React, { useState } from 'react';
import { 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  ExternalLink,
  Home,
  ArrowLeft,
  ArrowRight,
  Shield,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function MarketoBrowser() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const marketoUrl = 'https://experience.adobe.com/#/@oadsolutionsltd/';

  const handleRefresh = () => {
    setIsLoading(true);
    const iframe = document.getElementById('marketo-frame');
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  const handleOpenExternal = () => {
    window.open(marketoUrl, '_blank');
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-slate-900 flex flex-col`}>
      {/* Browser Chrome Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800 border-b border-slate-700/50 px-4 py-3"
      >
        <div className="flex items-center gap-4">
          {/* Window Controls */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors cursor-pointer" />
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700"
                    disabled
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Go back</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700"
                    disabled
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Go forward</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700"
                    onClick={handleRefresh}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* URL Bar */}
          <div className="flex-1 flex items-center gap-2 bg-slate-900/50 rounded-lg px-4 py-2 border border-slate-700/50">
            <Shield className="w-4 h-4 text-green-500" />
            <span className="text-sm text-slate-300 truncate font-mono">
              {marketoUrl}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700"
                    onClick={handleOpenExternal}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open in new tab</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </motion.div>

      {/* Browser Content */}
      <div className="flex-1 relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-100 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Loading Marketo...</p>
              <p className="text-sm text-slate-400 mt-1">Please wait while the platform loads</p>
            </div>
          </div>
        )}
        
        <iframe
          id="marketo-frame"
          src={marketoUrl}
          className="w-full h-full border-0"
          style={{ minHeight: isFullscreen ? '100vh' : 'calc(100vh - 60px)' }}
          onLoad={() => setIsLoading(false)}
          title="Adobe Marketo Engage"
          allow="fullscreen"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
        />

        {/* Info Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-4 right-4 max-w-sm"
        >
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Practice Environment</p>
                <p className="text-xs text-slate-400 mt-1">
                  You're connected to the Marketo platform. Apply your learning in real-time!
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}