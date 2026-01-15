import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AudioMeterProps {
  audioUrl?: string;
  isPlaying: boolean;
  volume: number;
  orientation?: 'horizontal' | 'vertical';
  showPeak?: boolean;
}

export function AudioMeter({ 
  audioUrl, 
  isPlaying, 
  volume,
  orientation = 'vertical',
  showPeak = true
}: AudioMeterProps) {
  const [leftLevel, setLeftLevel] = useState(0);
  const [rightLevel, setRightLevel] = useState(0);
  const [leftPeak, setLeftPeak] = useState(0);
  const [rightPeak, setRightPeak] = useState(0);
  const animationRef = useRef<number>();

  // Simulate audio levels (in a real app, you'd use Web Audio API)
  useEffect(() => {
    if (!isPlaying) {
      setLeftLevel(0);
      setRightLevel(0);
      return;
    }

    const animate = () => {
      // Simulate realistic audio levels
      const baseLevel = volume * 0.7;
      const variance = 0.3;
      
      const newLeft = Math.min(1, baseLevel + (Math.random() * variance - variance / 2));
      const newRight = Math.min(1, baseLevel + (Math.random() * variance - variance / 2));
      
      setLeftLevel(newLeft);
      setRightLevel(newRight);
      
      // Update peaks
      if (newLeft > leftPeak) {
        setLeftPeak(newLeft);
        setTimeout(() => setLeftPeak(prev => prev === newLeft ? 0 : prev), 1500);
      }
      if (newRight > rightPeak) {
        setRightPeak(newRight);
        setTimeout(() => setRightPeak(prev => prev === newRight ? 0 : prev), 1500);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, volume]);

  const getColorClass = (level: number) => {
    if (level > 0.9) return 'bg-red-500';
    if (level > 0.7) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const dbLabels = [0, -6, -12, -24, -48];

  if (orientation === 'horizontal') {
    return (
      <div className="flex items-center gap-1 h-4">
        <span className="text-[8px] text-gray-600 w-4">L</span>
        <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden relative">
          <div 
            className={cn('h-full transition-all duration-75 rounded-full', getColorClass(leftLevel))}
            style={{ width: `${leftLevel * 100}%` }}
          />
          {showPeak && leftPeak > 0 && (
            <div 
              className="absolute top-0 h-full w-0.5 bg-white"
              style={{ left: `${leftPeak * 100}%` }}
            />
          )}
        </div>
        <span className="text-[8px] text-gray-600 w-4">R</span>
        <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden relative">
          <div 
            className={cn('h-full transition-all duration-75 rounded-full', getColorClass(rightLevel))}
            style={{ width: `${rightLevel * 100}%` }}
          />
          {showPeak && rightPeak > 0 && (
            <div 
              className="absolute top-0 h-full w-0.5 bg-white"
              style={{ left: `${rightPeak * 100}%` }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-0.5 relative">
      {/* dB scale */}
      <div className="w-5 h-full flex flex-col justify-between py-1">
        {dbLabels.map(db => (
          <span key={db} className="text-[7px] text-gray-600 text-right">{db}</span>
        ))}
      </div>

      {/* Left channel */}
      <div className="w-3 h-full bg-[#1a1a1a] rounded overflow-hidden relative flex flex-col-reverse">
        <div 
          className={cn('w-full transition-all duration-75', getColorClass(leftLevel))}
          style={{ height: `${leftLevel * 100}%` }}
        />
        {showPeak && leftPeak > 0 && (
          <div 
            className="absolute left-0 right-0 h-0.5 bg-white"
            style={{ bottom: `${leftPeak * 100}%` }}
          />
        )}
      </div>

      {/* Right channel */}
      <div className="w-3 h-full bg-[#1a1a1a] rounded overflow-hidden relative flex flex-col-reverse">
        <div 
          className={cn('w-full transition-all duration-75', getColorClass(rightLevel))}
          style={{ height: `${rightLevel * 100}%` }}
        />
        {showPeak && rightPeak > 0 && (
          <div 
            className="absolute left-0 right-0 h-0.5 bg-white"
            style={{ bottom: `${rightPeak * 100}%` }}
          />
        )}
      </div>

      {/* Channel labels */}
      <div className="w-4 flex flex-col justify-end">
        <div className="flex gap-px">
          <span className="text-[6px] text-gray-600 w-3 text-center">L</span>
          <span className="text-[6px] text-gray-600 w-3 text-center">R</span>
        </div>
      </div>
    </div>
  );
}
