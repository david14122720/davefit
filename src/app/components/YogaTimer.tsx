import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface YogaTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
  autoStart?: boolean;
  poseName?: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const YogaTimer = React.memo(function YogaTimer({
  initialSeconds,
  onComplete,
  autoStart = false,
  poseName,
}: YogaTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isComplete, setIsComplete] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const progress = ((initialSeconds - seconds) / initialSeconds) * 100;
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const playSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            playSound();
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, playSound, onComplete, seconds]);

  const handlePlayPause = useCallback(() => {
    if (isComplete) {
      setSeconds(initialSeconds);
      setIsComplete(false);
    }
    setIsRunning((prev) => !prev);
  }, [isComplete, initialSeconds]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setSeconds(initialSeconds);
    setIsComplete(false);
  }, [initialSeconds]);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6">
      {/* Hidden audio element for completion sound */}
      <audio ref={audioRef} preload="auto">
        <source src="/sounds/bell.mp3" type="audio/mpeg" />
      </audio>

      {/* Pose name */}
      {poseName && (
        <motion.h3
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-bold text-white mb-6 text-center"
        >
          {poseName}
        </motion.h3>
      )}

      {/* Timer Ring */}
      <div className="relative w-64 h-64">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <motion.circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke={isComplete ? '#22c55e' : '#ff6b00'}
            strokeWidth="8"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'linear' }}
            style={{
              filter: 'drop-shadow(0 0 15px rgba(249, 115, 22, 0.5))',
            }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={seconds}
            initial={{ scale: 1.1, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-5xl font-extrabold ${isComplete ? 'text-green-400' : 'text-white'}`}
          >
            {formatTime(seconds)}
          </motion.span>
          {isComplete && (
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-400 font-bold mt-2"
            >
              ✓ Completo
            </motion.span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-8">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggleSound}
          className="p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePlayPause}
          className={`p-4 rounded-full ${
            isComplete
              ? 'bg-green-500 text-black'
              : isRunning
              ? 'bg-orange-500 text-black'
              : 'bg-white text-black'
          } shadow-lg transition-colors`}
          style={{
            boxShadow: isRunning
              ? '0 0 30px rgba(249, 115, 22, 0.5)'
              : '0 0 20px rgba(255,255,255,0.2)',
          }}
        >
          {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleReset}
          className="p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Quick time presets */}
      <div className="flex items-center gap-2 mt-6">
        {[30, 60, 90, 120].map((preset) => (
          <button
            key={preset}
            onClick={() => {
              setSeconds(preset);
              setIsRunning(false);
              setIsComplete(false);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              seconds === preset && !isRunning
                ? 'bg-orange-500 text-black'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {preset}s
          </button>
        ))}
      </div>
    </div>
  );
});

export default YogaTimer;