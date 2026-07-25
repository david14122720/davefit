import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

export default function BibliotecaPage() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
        >
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        Biblioteca de Rutinas
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Explora todas las rutinas de ejercicios y yoga disponibles.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div
                        key={i}
                        className="bg-[#141414] border border-white/5 rounded-2xl p-6 animate-pulse"
                    >
                        <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />
                        <div className="h-3 bg-white/5 rounded w-full mb-2" />
                        <div className="h-3 bg-white/5 rounded w-2/3" />
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
