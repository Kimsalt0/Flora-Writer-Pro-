import React from 'react';
import { motion } from 'motion/react';
import { Flower2 } from 'lucide-react';

export const FloatingPetals = () => {
  const petals = Array.from({ length: 12 });
  
  // New color palette from user image
  const colors = [
    '#FFCE99', // Peach Orange
    '#F58421', // Ornery Tangerine
    '#3B5226', // Army Green
    '#D44084', // Jaipur Pink
    '#FFB5C7'  // Cherry Blossom Pink
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {petals.map((_, i) => {
        const startX = Math.random() * 100;
        const drift = (Math.random() - 0.5) * 60; // Horizontal drift
        const color = colors[i % colors.length];
        const duration = 25 + Math.random() * 15; // Much slower descent
        const delay = -Math.random() * 25; // Started at different depths
        
        return (
          <motion.div
            key={i}
            initial={{ 
              x: `${startX}%`, 
              y: -100, 
              opacity: 0,
              rotate: Math.random() * 360,
              scale: 0.3 + Math.random() * 0.7
            }}
            animate={{ 
              y: '110vh',
              x: [`${startX}%`, `${startX + drift}%`],
              opacity: [0, 0.6, 0.6, 0], // Increased visibility
              rotate: [0, 360, 720],
            }}
            transition={{ 
              duration, 
              repeat: Infinity, 
              delay,
              ease: "linear"
            }}
            style={{ color }}
            className="absolute drop-shadow-sm"
          >
            <Flower2 size={12 + Math.random() * 24} />
          </motion.div>
        );
      })}
    </div>
  );
};
