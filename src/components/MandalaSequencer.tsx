import React, { useMemo } from 'react';
import { Step } from '../types';
import { motion } from 'motion/react';

interface MandalaSequencerProps {
  sequence: Step[];
  currentStep: number;
  focusedBar: number | null;
  onBarClick: (barIndex: number) => void;
}

export const MandalaSequencer: React.FC<MandalaSequencerProps> = ({ 
  sequence, 
  currentStep, 
  focusedBar, 
  onBarClick 
}) => {
  // Dynamic rings based on actual sequence length
  const totalBars = Math.max(1, Math.ceil(sequence.length / 16));
  const rings = Array.from({ length: totalBars }, (_, i) => i);

  // Scaled radius math: ensure all rings fit comfortably within container
  const maxRadius = 145;
  const minRadius = 36;
  const radiusStep = totalBars > 1 ? (maxRadius - minRadius) / (totalBars - 1) : 0;

  return (
    <div className="relative w-[280px] h-[280px] md:w-[320px] md:h-[320px] flex items-center justify-center">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-slate-900/50 rounded-full blur-xl" />

      {rings.map((barIndex) => {
        const isFocused = focusedBar === barIndex;
        const isDimmed = focusedBar !== null && !isFocused;
        const radius = totalBars === 1 ? 80 : minRadius + (barIndex * radiusStep);
        
        // Get steps for this bar
        const barSteps = sequence.slice(barIndex * 16, (barIndex + 1) * 16);

        return (
          <div 
            key={`mandala-ring-${barIndex}`}
            className={`absolute rounded-full border transition-all duration-300 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5
              ${isFocused ? 'border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'border-slate-800'}
              ${isDimmed ? 'opacity-20' : 'opacity-100'}
            `}
            style={{
              width: radius * 2,
              height: radius * 2,
              zIndex: 20 - barIndex
            }}
            onClick={() => onBarClick(barIndex)}
          >
            {/* Step Dots */}
            {barSteps.map((step, stepIndex) => {
              const globalStepIndex = (barIndex * 16) + stepIndex;
              const isActive = currentStep === globalStepIndex;
              const angle = (stepIndex / 16) * 360 - 90; // Start at top
              
              // Visual Style based on Note Type
              let dotClass = "w-1.5 h-1.5 rounded-full bg-slate-700";
              let opacity = 0.3;

              if (step.type === 'accent') {
                 dotClass = "w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]";
                 opacity = 1;
              } else if (step.type === 'ghost') {
                 dotClass = "w-1.5 h-1.5 rounded-full bg-emerald-700";
                 opacity = 0.6;
              } else if (step.type === 'slap') {
                 dotClass = "w-2 h-2 rotate-45 bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.8)]"; // Diamond/Square
                 opacity = 1;
              } else if (step.type === 'rest' || step.type === 'empty') {
                 opacity = 0.1;
              }

              if (isActive) {
                 dotClass = "w-3 h-3 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,1)] scale-125 z-20";
                 opacity = 1;
                 if (step.type === 'slap') dotClass += " rotate-45 bg-red-100";
              }

              return (
                <div
                  key={`mandala-step-${barIndex}-${stepIndex}`}
                  className={`absolute top-1/2 left-1/2 transition-all duration-75 ${dotClass}`}
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px) rotate(${-angle}deg)`,
                    opacity
                  }}
                />
              );
            })}
          </div>
        );
      })}
      
      {/* Center Label */}
      <div className="absolute z-20 text-[10px] font-mono text-slate-500 uppercase tracking-widest pointer-events-none">
        {focusedBar !== null ? `BAR ${focusedBar + 1}` : 'FULL'}
      </div>
    </div>
  );
};
