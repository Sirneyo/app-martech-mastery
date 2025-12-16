import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

export default function CertificatePreviewModal({ isOpen, onClose, certificateUrl, certificateId }) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = certificateUrl;
    link.download = `MarTech_Mastery_Certificate_${certificateId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Your MarTech Mastery Certificate</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col gap-4 h-full">
          <div className="flex-1 bg-slate-100 rounded-lg overflow-hidden">
            <iframe
              src={certificateUrl}
              className="w-full h-full border-0"
              title="Certificate Preview"
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleDownload} className="bg-violet-600 hover:bg-violet-700">
              <Download className="w-4 h-4 mr-2" />
              Download Certificate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}