import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Award, Users, Star, ArrowRight, CheckCircle, Clock, UserCheck, Play } from 'lucide-react';
import { BenefitsGrid } from '../components/BenefitsCard';
import SuggestionsSection from '../components/SuggestionsSection';
import { Link } from 'react-router-dom';

interface StatsData {
  exercises: number;
  users: number;
  rating: number;
  reviews: number;
}

function StatCard({ icon: Icon, value, label, suffix, isRating }: {
  icon: React.ElementType;
  value: number;
  label: string;
  suffix: string;
  isRating?: boolean;
}) {
  const display = isRating && value > 0 ? value.toFixed(1) : value > 0 ? value.toLocaleString() : '—';

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="p-5 rounded-xl bg-white/5 backdrop-blur-xs border border-white/10 hover:border-primary/30 transition-all group text-center"
    >
      <Icon className="w-6 h-6 text-primary mb-2 mx-auto" />
      <div className="text-3xl font-bold text-white">{display}{!isRating && value > 0 ? suffix : ''}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
      {isRating && value > 0 && (
        <div className="flex justify-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map(star => (
            <Star key={star} className={`w-3 h-3 ${Math.round(value) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function StepCard({ number, icon: Icon, title, description }: {
  number: string;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="p-6 rounded-2xl bg-background-card border border-white/5 hover:border-primary/30 transition-all hover:shadow-[0_0_20px_rgba(255,107,0,0.1)] group text-center"
    >
      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(255,107,0,0.2)] group-hover:shadow-[0_0_25px_rgba(255,107,0,0.4)] transition-all">
        <Icon className="w-7 h-7 text-primary" strokeWidth={2} />
      </div>
      <div className="text-sm text-primary font-bold mb-2">Paso {number}</div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </motion.div>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export default function AcercaDePage() {
  const [stats, setStats] = useState<StatsData>({ exercises: 0, users: 0, rating: 0, reviews: 0 });

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        if (data.exercises !== undefined) setStats(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-full">
      {/* ===== Hero Section ===== */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* Background gradient with orange glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-linear-to-b from-background-dark via-background-dark to-background-card" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary/8 rounded-full blur-[140px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px]" />
          <div className="absolute top-1/4 left-1/4 w-[200px] h-[200px] bg-primary/5 rounded-full blur-[60px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6"
          >
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Para estudiantes ocupados
          </motion.div>

          {/* Heading */}
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-bold text-white leading-tight mb-6"
          >
            La Plataforma de Entrenamiento
            <br />
            <span className="text-primary">Inteligente para Estudiantes</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-gray-400 max-w-2xl mx-auto mb-8"
          >
            DaveFit es la plataforma de fitness diseñada específicamente para estudiantes.
            Entrenamientos cortos y efectivos sin equipo, adaptados a tu horario.
          </motion.p>

          {/* CTAs */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Link
              to="/register"
              className="px-8 py-4 bg-primary hover:bg-primary-light text-white font-bold rounded-xl transition-all shadow-[0_0_30px_rgba(255,107,0,0.4)] hover:shadow-[0_0_40px_rgba(255,107,0,0.6)] inline-flex items-center gap-2 justify-center"
            >
              Comenzar gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/biblioteca"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all inline-flex items-center gap-2 justify-center"
            >
              Explorar Biblioteca
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto"
          >
            <StatCard icon={Dumbbell} value={stats.exercises} label="Ejercicios" suffix="+" />
            <StatCard icon={Users} value={stats.users} label="Usuarios Registrados" suffix="+" />
            <StatCard icon={Star} value={stats.rating} label="Valoración" suffix="" isRating />
          </motion.div>
        </div>
      </section>

      {/* ===== Mission Section ===== */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
                Nuestra Misión
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                ¿Qué es <span className="text-primary">DaveFit</span>?
              </h2>
              <div className="space-y-4 text-gray-400">
                <p>
                  DaveFit nació con una misión clara: hacer que el fitness sea accesible para todos los estudiantes.
                  Sabemos que tu tiempo es limitado entre clases, exámenes y trabajos, por eso creamos entrenamientos
                  que se adaptan a tu horario.
                </p>
                <p>
                  No necesitas equipo costoso ni membresías de gimnasio. Solo tu cuerpo, ganas de moverte, y
                  algunos minutos al día. Nuestra plataforma inteligente te recomienda rutinas basadas en tu
                  nivel, tiempo disponible y objetivos.
                </p>
              </div>
              <div className="mt-8 space-y-3">
                {[
                  'Entrenamientos sin equipo, en cualquier lugar',
                  'Rutinas inteligentes adaptadas a tu tiempo',
                  'Comunidad activa de estudiantes como tú',
                ].map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-white text-sm sm:text-base">{item}</span>
                  </motion.div>
                ))}
              </div>
              <Link
                to="/biblioteca"
                className="mt-8 inline-flex items-center gap-2 text-primary hover:text-primary-light font-medium transition-colors group"
              >
                Conoce más sobre nosotros
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>

            {/* Side image placeholder */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="aspect-square rounded-2xl bg-linear-to-br from-primary/20 via-primary/10 to-background-dark border border-primary/10 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,107,0,0.1),transparent_70%)]" />
                <Dumbbell className="w-32 h-32 text-primary/20" strokeWidth={1} />
              </div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== How it Works ===== */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
              Cómo Funciona
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Empieza en <span className="text-primary">3 pasos</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              No podría ser más simple. En menos de 5 minutos estarás listo para tu primer entrenamiento.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { number: '01', icon: UserCheck, title: 'Crea tu perfil', desc: 'Regístrate gratis y completa tu perfil con tus objetivos y disponibilidad.' },
              { number: '02', icon: Clock, title: 'Selecciona tu tiempo', desc: 'Elige cuánto tiempo tienes: 5, 10, 15 o 30 minutos. Nosotros hacemos el resto.' },
              { number: '03', icon: Play, title: 'Empieza a entrenar', desc: 'Sigue las rutinas guiadas con ejercicios adaptados a tu nivel y espacio.' },
            ].map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <StepCard {...step} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Benefits Section ===== */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
              Beneficios
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              ¿Por qué <span className="text-primary">DaveFit</span>?
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Todo lo que necesitas para mantenerte activo sin complicaciones.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <BenefitsGrid />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-center mt-10"
          >
            <Link
              to="/biblioteca"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary-light text-white font-bold rounded-xl transition-all shadow-[0_0_30px_rgba(255,107,0,0.4)] hover:shadow-[0_0_40px_rgba(255,107,0,0.6)]"
            >
              Explorar Biblioteca
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ===== Suggestions Section ===== */}
      <div className="border-t border-white/5">
        <SuggestionsSection />
      </div>
    </div>
  );
}
