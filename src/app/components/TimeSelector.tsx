import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Clock, Timer, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

const timeOptions = [
    { value: 10, label: '10 min', icon: <Zap className="w-5 h-5 text-yellow-400" />, shadow: 'shadow-yellow-500/20' },
    { value: 20, label: '20 min', icon: <Timer className="w-5 h-5 text-orange-500" />, shadow: 'shadow-orange-500/20' },
    { value: 40, label: '40 min', icon: <Flame className="w-5 h-5 text-red-500" />, shadow: 'shadow-red-500/20' },
];

export default function TimeSelector() {
    const navigate = useNavigate();

    const handleTimeSelect = (minutes: number) => {
        navigate(`/rutinas?duration=${minutes}`);
    };

    return (
        <div className="flex flex-col gap-3 w-full md:w-auto">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Entrenamiento Express</p>
            <div className="flex gap-3">
                {timeOptions.map((opt) => (
                    <motion.button
                        key={opt.value}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleTimeSelect(opt.value)}
                        className={`
                            flex-1 md:flex-none flex items-center justify-center gap-2 
                            px-4 py-3 rounded-xl bg-[#141414] border border-white/5 
                            hover:border-white/10 hover:bg-[#1a1a1a] transition-all 
                            group relative overflow-hidden shadow-lg ${opt.shadow}
                        `}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10">{opt.icon}</span>
                        <span className="relative z-10 text-white font-black text-sm tracking-tight">{opt.label}</span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
