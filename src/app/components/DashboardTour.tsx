import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, History, User, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';

interface TourStep {
    targetId?: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    actionLabel?: string;
    actionPath?: string;
}

interface DashboardTourProps {
    isOpen: boolean;
    onComplete: () => void;
}

export default function DashboardTour({ isOpen, onComplete }: DashboardTourProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const navigate = useNavigate();

    const steps: TourStep[] = [
        {
            title: "Tu Dashboard",
            description: "Aquí verás un resumen de tu actividad, tus rachas de entrenamiento y tu progreso de XP. ¡Gana puntos por cada sesión!",
            icon: <LayoutDashboard className="w-8 h-8 text-orange-500" />
        },
        {
            title: "Arsenal de Rutinas",
            description: "En la sección de Rutinas encontrarás entrenamientos diseñados para espacios pequeños. ¡Filtra por tiempo y nivel!",
            icon: <Dumbbell className="w-8 h-8 text-orange-500" />
        },
        {
            title: "Tu Historial",
            description: "Cada gota de sudor cuenta. Revisa tus sesiones pasadas, calorías quemadas y minutos totales aquí.",
            icon: <History className="w-8 h-8 text-orange-500" />
        },
        {
            title: "⚔️ ¡Paso Vital!",
            description: "Para darte las mejores recomendaciones, necesitamos conocerte. Completa tu perfil físico y tus objetivos ahora.",
            icon: <User className="w-8 h-8 text-orange-500" />,
            actionLabel: "Ir a mi Perfil",
            actionPath: "/perfil"
        }
    ];

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const handleAction = () => {
        const step = steps[currentStep];
        if (step.actionPath) {
            onComplete();
            navigate(step.actionPath);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                {/* Overlay with subtle blur */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Tour Card */}
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-3xl shadow-2xl p-8 overflow-hidden"
                >
                    {/* Step Indicator */}
                    <div className="flex gap-1.5 mb-8 justify-center">
                        {steps.map((_, i) => (
                            <div 
                                key={i}
                                className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-orange-500' : 'w-4 bg-white/10'}`}
                            />
                        ))}
                    </div>

                    <div className="text-center">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/5"
                        >
                            {steps[currentStep].icon}
                        </motion.div>

                        <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                            {steps[currentStep].title}
                        </h3>
                        <p className="text-gray-400 text-base leading-relaxed mb-10 px-2 font-medium">
                            {steps[currentStep].description}
                        </p>

                        <div className="flex gap-3">
                            {steps[currentStep].actionLabel ? (
                                <button
                                    onClick={handleAction}
                                    className="flex-1 py-4 bg-orange-500 hover:bg-orange-400 text-white font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group"
                                >
                                    {steps[currentStep].actionLabel}
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            ) : (
                                <button
                                    onClick={nextStep}
                                    className="flex-1 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                >
                                    Siguiente
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </button>
                            )}
                        </div>
                        
                        {currentStep < steps.length - 1 && (
                            <button 
                                onClick={onComplete}
                                className="mt-6 text-sm text-gray-500 hover:text-gray-400 transition-colors font-medium underline underline-offset-4"
                            >
                                Saltar recorrido
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
