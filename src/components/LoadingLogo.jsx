import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingLogo({ size = 84 }) {
  return (
    <div className="flex items-center justify-center">
      <motion.img
        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693261f4a46b591b7d38e623/96938fb06_OADSolutionsRebrand1.png"
        alt="Loading"
        style={{ width: size, height: size }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [1, 0.8, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}