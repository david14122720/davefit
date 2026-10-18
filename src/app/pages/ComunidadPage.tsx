import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import { queryWithRetry } from '../../lib/db';
import { normalizeStorageUrl } from '../../lib/storage-url';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Crown,
  Dumbbell,
  Flame,
  ListOrdered,
  Medal,
  Rss,
  Star,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SuggestionsSection from '../components/SuggestionsSection';

interface LeaderboardUser {
  rank: number;
  user_id: string;
  username: string;
  avatar_url?: string;
  dias_racha: number;
  total_score: number;
  total_workouts: number;
}

type SortKey = 'points' | 'streak' | 'sessions';

// Columnas reales de user_stats_public: xp_total / dias_racha / total_workouts.
const SORT_OPTIONS: {
  key: SortKey;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'points', label: 'Puntos', Icon: Flame },
  { key: 'streak', label: 'Racha', Icon: Zap },
  { key: 'sessions', label: 'Sesiones', Icon: Dumbbell },
];

/** Ordena el ranking por la columna elegida y reasigna puestos (1..N). */
function sortLeaderboard(users: LeaderboardUser[], key: SortKey): LeaderboardUser[] {
  const sorted = [...users].sort((a, b) => {
    if (key === 'streak') return b.dias_racha - a.dias_racha || b.total_score - a.total_score;
    if (key === 'sessions') return b.total_workouts - a.total_workouts || b.total_score - a.total_score;
    return b.total_score - a.total_score || b.dias_racha - a.dias_racha;
  });
  return sorted.map((u, i) => ({ ...u, rank: i + 1 }));
}

const Avatar = ({
  src,
  name,
  size = 'md',
  className = '',
}: {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-base',
    lg: 'w-14 h-14 text-base md:w-20 md:h-20 md:text-xl',
    xl: 'w-16 h-16 text-lg md:w-24 md:h-24 md:text-2xl',
  };
  // Relativa same-origin: sana URLs absolutas viejas y evita el bloqueo CSP.
  const normalized = normalizeStorageUrl(src);

  if (normalized) {
    return (
      <img
        src={normalized}
        alt={name || 'Usuario'}
        loading="lazy"
        decoding="async"
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-linear-to-br from-primary to-primary-dark flex items-center justify-center font-bold text-[#531900] ${className}`}
    >
      {(name || 'U').charAt(0).toUpperCase()}
    </div>
  );
};

/** Entrada del podio: #1 al centro (2-1-3), compacta en móvil. */
const PodiumEntry = ({ user, position }: { user: LeaderboardUser; position: 1 | 2 | 3 }) => {
  const isFirst = position === 1;
  const badgeStyles =
    position === 2 ? 'bg-[#e2e2e9] text-[#191c20]' : 'bg-[#ffdcc3] text-[#2f1500]';
  const MedalIcon = position === 2 ? Medal : Award;
  const pedestalHeight = position === 1 ? 'h-16' : position === 2 ? 'h-10' : 'h-6';
  const pedestalLabel = position === 1 ? 'I' : position === 2 ? 'II' : 'III';

  return (
    <motion.div
      data-testid={`athlete-${user.user_id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.08 }}
      className={`relative flex flex-col items-center ${isFirst ? 'md:-mt-6' : ''}`}
    >
      <div
        className={`relative w-full flex flex-col items-center text-center rounded-xl ${
          isFirst
            ? 'bg-transparent md:bg-[#201f20] md:p-6 md:shadow-xl md:shadow-primary/10'
            : 'md:bg-[#1c1b1c] md:p-6 md:shadow-md'
        }`}
      >
        <div
          className={`absolute -top-3 md:-top-4 w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-base font-black shadow-lg ${
            isFirst ? 'bg-primary text-[#531900]' : badgeStyles
          }`}
        >
          #{position}
        </div>

        <div
          className={`relative mt-6 mb-2 rounded-full ${
            isFirst
              ? 'p-1 bg-linear-to-tr from-[#ffb77d] via-primary to-primary shadow-lg'
              : 'p-1 bg-[#2a2a2b]'
          }`}
        >
          {isFirst && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
              <Crown className="w-7 h-7 md:w-9 md:h-9 text-primary drop-shadow-[0_0_12px_rgba(255,181,153,0.5)]" />
            </div>
          )}
          <Avatar
            src={user.avatar_url}
            name={user.username}
            size={isFirst ? 'xl' : 'lg'}
            className="ring-0"
          />
          {!isFirst && (
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#0e0e0f] shadow">
              <MedalIcon
                className={`w-4 h-4 ${position === 2 ? 'text-[#c5c6cc]' : 'text-[#ffb77d]'}`}
              />
            </div>
          )}
        </div>

        {isFirst && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider mb-1">
            Líder
          </span>
        )}

        <h3
          className={`font-bold text-[#e5e2e3] truncate max-w-full ${
            isFirst ? 'text-sm md:text-xl' : 'text-sm md:text-lg'
          }`}
        >
          {user.username}
        </h3>

        <div
          className={`w-full mt-2 rounded-lg py-2 px-2 md:px-3 flex flex-col md:flex-row items-center md:justify-between gap-0.5 md:gap-2 ${
            isFirst ? 'bg-[#201f20] md:bg-[#0e0e0f] md:py-2.5' : 'bg-[#0e0e0f]'
          }`}
        >
          <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-[#929399]">
            {isFirst ? 'Puntaje total' : 'Puntos'}
          </span>
          <div className="flex items-center gap-1">
            <span
              className={`font-black text-primary ${
                isFirst ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'
              }`}
            >
              {user.total_score.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-[#929399]">PTS</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center gap-3 text-[11px] md:text-xs text-[#9ea3ae]">
          <span className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-primary" />
            {user.dias_racha}d
          </span>
          <span className="hidden md:flex items-center gap-1">
            <Dumbbell className="w-3.5 h-3.5 text-[#ffb77d]" />
            {user.total_workouts} entrenamientos
          </span>
        </div>
      </div>

      <div
        className={`hidden md:flex w-full ${pedestalHeight} bg-[#2a2a2b] rounded-b-xl mt-1 items-center justify-center text-sm font-black text-primary`}
      >
        {pedestalLabel}
      </div>
    </motion.div>
  );
};

/** Fila del resto del ranking (desde el puesto 4). */
const LeaderboardRow = ({ user }: { user: LeaderboardUser }) => (
  <motion.div
    layout
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    data-testid={`athlete-${user.user_id}`}
    className="p-4 flex items-center justify-between gap-3 hover:bg-[#201f20] transition-colors"
  >
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-6 text-center text-base md:text-lg font-black text-[#929399]">
        {user.rank}
      </span>
      <Avatar
        src={user.avatar_url}
        name={user.username}
        size="sm"
        className="ring-1 ring-white/10"
      />
      <div className="min-w-0">
        <div className="font-bold text-[#e5e2e3] truncate">{user.username}</div>
        <div className="text-[11px] md:text-xs text-[#9ea3ae] truncate">
          {user.total_workouts} entrenamientos · Racha {user.dias_racha}d
        </div>
      </div>
    </div>
    <div className="flex items-center justify-end gap-1 shrink-0">
      <span className="font-bold text-[#e5e2e3]">{user.total_score.toLocaleString()}</span>
      <span className="text-[10px] font-bold text-[#9ea3ae]">PTS</span>
    </div>
  </motion.div>
);

interface MyProgress {
  me: LeaderboardUser;
  rank: number;
  inTop10: boolean;
  needed: number;
  percent: number;
}

/** Fila del usuario actual: puesto real + progreso calculado hacia el Top 10. */
const MyRankCard = ({ progress, name, nivel }: { progress: MyProgress; name: string; nivel?: string | null }) => {
  const { me, rank, inTop10, needed, percent } = progress;

  return (
    <section className="max-w-4xl mx-auto mb-8">
      <div className="relative overflow-hidden bg-[#2a2a2b] rounded-xl p-4 md:p-5 shadow-xl">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
            <div className="flex flex-col items-center justify-center bg-[#0e0e0f] px-3 md:px-4 py-2 rounded-lg min-w-[64px]">
              <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-[#9ea3ae]">
                Puesto
              </span>
              <span className="text-xl md:text-2xl font-black text-primary">#{rank}</span>
            </div>

            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                src={me.avatar_url}
                name={me.username}
                size="sm"
                className="ring-2 ring-primary/40"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#e5e2e3] truncate">Tú ({name})</span>
                  {nivel && (
                    <span className="px-2 py-0.5 rounded-full bg-[#353436] text-primary text-[10px] md:text-[11px] font-semibold whitespace-nowrap">
                      Nivel {nivel}
                    </span>
                  )}
                </div>
                <span className="text-[11px] md:text-xs text-[#9ea3ae]">
                  {me.total_workouts} entrenamientos · Racha activa: {me.dias_racha}{' '}
                  {me.dias_racha === 1 ? 'día' : 'días'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
            <div className="text-left md:text-right">
              <div className="flex items-center md:justify-end gap-1 font-bold text-[#e5e2e3]">
                <Star className="w-4 h-4 text-primary" />
                <span>{me.total_score.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-[#9ea3ae]">PTS</span>
              </div>
              <div className="text-[11px] md:text-xs font-medium text-primary">
                {inTop10 ? 'Top 10 asegurado' : `+${needed} pts para entrar al Top 10`}
              </div>
            </div>
            <Link
              to="/biblioteca"
              className="md:hidden inline-flex items-center gap-1 h-10 px-3.5 rounded-lg bg-primary text-[#531900] font-bold text-sm shadow-md active:scale-95 transition-transform"
            >
              Entrenar
              <Zap className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="relative z-10 mt-4 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] md:text-[11px] text-[#9ea3ae]">
            <span className="hidden md:inline">
              {inTop10
                ? 'Progreso hacia el Top 10'
                : `Progreso hacia el Top 10 (${needed} PTS requeridos)`}
            </span>
            <span className="md:hidden">Puesto actual #{rank}</span>
            <span className="hidden md:inline font-semibold text-primary">
              {percent}% completado
            </span>
            <span className="md:hidden font-semibold text-primary">
              {percent}% camino al Top 10
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#0e0e0f] overflow-hidden">
            <div
              className="h-full rounded-full bg-linear-to-r from-[#ffb77d] to-primary transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default function ComunidadPage() {
  const { user, perfil } = useAuth();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('points');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data: perfilesData, error: pError } = await queryWithRetry<any[]>(() =>
        insforge.database.from('perfiles_public').select('id, nombre_completo, avatar_url')
      );

      if (pError) {
        console.error('Error loading perfiles:', pError);
        setError('No pudimos acceder a los datos de la comunidad en este momento.');
        return;
      }

      const { data: statsData, error: sError } = await queryWithRetry<any[]>(() =>
        insforge.database.from('user_stats_public').select('user_id, xp_total, total_workouts, dias_racha')
      );

      if (sError) {
        console.error('Error loading stats:', sError);
        setError('Hubo un problema al cargar las puntuaciones de los usuarios.');
        return;
      }

      const statsMap = new Map();
      if (statsData) {
        statsData.forEach((stat: any) => {
          statsMap.set(stat.user_id, stat);
        });
      }

      if (perfilesData && perfilesData.length > 0) {
        const leaderboardUsers: LeaderboardUser[] = perfilesData.map((profile: any) => {
          const stats = statsMap.get(profile.id);
          return {
            rank: 0,
            user_id: profile.id,
            username: profile.nombre_completo?.split(' ')[0] || 'Atleta',
            avatar_url: profile.avatar_url,
            dias_racha: stats?.dias_racha || 0,
            total_score: stats?.xp_total || 0,
            total_workouts: stats?.total_workouts || 0,
          };
        });

        const sorted = leaderboardUsers.sort((a, b) => b.total_score - a.total_score);
        sorted.forEach((u, i) => { u.rank = i + 1; });
        setUsers(sorted);
      }
    } catch (e) {
      console.error('Exception loading leaderboard:', e);
      setError('Ocurrió un error inesperado al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const rankedUsers = useMemo(() => sortLeaderboard(users, sortKey), [users, sortKey]);
  const top3 = useMemo(() => rankedUsers.slice(0, 3), [rankedUsers]);
  const rest = useMemo(() => rankedUsers.slice(3), [rankedUsers]);

  // Ranking canónico por puntos (independiente del orden visible): define el
  // puesto real y el progreso hacia el Top 10.
  const xpRanking = useMemo(() => sortLeaderboard(users, 'points'), [users]);

  const myProgress = useMemo<MyProgress | null>(() => {
    if (!user) return null;
    const index = xpRanking.findIndex((u) => u.user_id === user.id);
    if (index === -1) return null;

    const me = xpRanking[index];
    const rank = index + 1;
    const tenth = xpRanking[9];

    // Dentro del Top 10 (o con menos de 10 atletas) ya está clasificado.
    if (rank <= 10 || !tenth) {
      return { me, rank, inTop10: true, needed: 0, percent: 100 };
    }

    const needed = Math.max(0, tenth.total_score - me.total_score);
    if (needed === 0) {
      return { me, rank, inTop10: true, needed: 0, percent: 100 };
    }

    const percent = Math.min(100, Math.round((me.total_score / tenth.total_score) * 100));
    return { me, rank, inTop10: false, needed, percent };
  }, [user, xpRanking]);

  const myName = perfil?.nombre_completo?.split(' ')[0] || myProgress?.me.username || 'Atleta';

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <header className="flex flex-col items-center text-center pt-4 pb-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-primary/30 rounded-xl blur-md" />
          <div className="relative w-14 h-14 rounded-xl bg-[#2a2a2b] flex items-center justify-center shadow-lg">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
        </div>

        <span className="px-3 py-0.5 rounded-full bg-[#201f20] text-[11px] font-bold text-primary uppercase tracking-wider mb-2">
          Temporada Alpha 2025
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#e5e2e3] tracking-tight mb-2">
          Comunidad <span className="text-primary">DaveFit</span>
        </h1>
        <p className="text-base text-[#9ea3ae] max-w-xl">
          Domina el ranking y alcanza la cima del Olimpo. Cada repetición suma puntos para tu
          prestigio atlético universitario.
        </p>
      </header>

      {error ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto text-center p-8 bg-[#1c1b1c] border border-red-500/20 rounded-xl mt-12 shadow-[0_10px_40px_rgba(239,68,68,0.1)]"
        >
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Conexión Caída</h3>
          <p className="text-[#9ea3ae] mb-6 text-sm">{error}</p>
          <button
            onClick={loadLeaderboard}
            className="px-6 py-3 bg-primary hover:bg-primary-dark transition-colors text-[#531900] font-bold rounded-xl text-sm w-full shadow-lg shadow-primary/20"
          >
            Reintentar
          </button>
        </motion.div>
      ) : loading ? (
        <div className="animate-pulse" aria-hidden="true">
          <div className="max-w-4xl mx-auto h-12 bg-[#1c1b1c] rounded-xl mb-6" />
          <div className="max-w-4xl mx-auto grid grid-cols-3 items-end gap-3 md:pt-10">
            <div className="h-40 bg-[#1c1b1c] rounded-xl" />
            <div className="h-56 bg-[#1c1b1c] rounded-xl border border-primary/20" />
            <div className="h-32 bg-[#1c1b1c] rounded-xl" />
          </div>
          <div className="max-w-4xl mx-auto h-20 bg-[#1c1b1c] rounded-xl mt-6" />
          <div className="max-w-4xl mx-auto h-32 bg-[#2a2a2b] rounded-xl mt-6" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
            <div className="lg:col-span-7 h-80 bg-[#1c1b1c] rounded-xl" />
            <div className="lg:col-span-5 h-80 bg-[#1c1b1c] rounded-xl" />
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="max-w-md mx-auto text-center p-8 bg-[#1c1b1c] border border-white/5 rounded-xl">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Aún no hay atletas en el ranking</h3>
          <p className="text-[#9ea3ae] text-sm">
            Completa tu primera sesión y sé el primero en sumar puntos para el Olimpo.
          </p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Control de orden por columnas reales */}
          <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-2 bg-[#0e0e0f] rounded-xl p-1.5">
            <span className="hidden md:inline px-3 text-[11px] font-bold uppercase tracking-wider text-[#9ea3ae]">
              Ranking histórico
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto md:justify-end">
              <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-[#9ea3ae] whitespace-nowrap">
                Ordenar por:
              </span>
              <div className="flex items-center gap-1 bg-[#201f20] px-1.5 py-1 rounded-lg">
                {SORT_OPTIONS.map(({ key, label, Icon }) => {
                  const active = sortKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSortKey(key)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] md:text-[13px] font-semibold transition-colors ${
                        active
                          ? 'bg-primary text-[#531900] shadow-sm'
                          : 'text-[#9ea3ae] hover:text-[#e5e2e3] hover:bg-[#2a2a2b]'
                      }`}
                    >
                      <Icon className="w-[15px] h-[15px]" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Podio top 3 (desktop 2-1-3 con pedestales; móvil compacto) */}
          <section className="mt-4 mb-8">
            <div className="relative max-w-4xl mx-auto md:pt-10">
              <div className="bg-[#1c1b1c] md:bg-transparent rounded-2xl p-3 md:p-0">
                <div className="grid grid-cols-3 items-end gap-2 md:gap-4">
                  {top3[1] && <PodiumEntry user={top3[1]} position={2} />}
                  {top3[0] && <PodiumEntry user={top3[0]} position={1} />}
                  {top3[2] && <PodiumEntry user={top3[2]} position={3} />}
                </div>
              </div>
            </div>
          </section>

          {/* Card motivacional con CTA real */}
          <section className="max-w-4xl mx-auto mb-8">
            <div className="bg-linear-to-r from-[#1c1b1c] via-[#201f20] to-[#1c1b1c] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-[#e5e2e3]">¡Sigue así! El podio te espera 🔥</p>
                  <p className="text-sm text-[#9ea3ae]">
                    Completa tu sesión de hoy para sumar puntos y escalar posiciones.
                  </p>
                </div>
              </div>
              <Link
                to="/biblioteca"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-[#531900] font-bold whitespace-nowrap shadow-md shadow-primary/20 hover:brightness-105 active:scale-95 transition-all"
              >
                Entrenar ahora
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>

          {/* Fila del usuario actual (solo con sesión iniciada y puesto real) */}
          {myProgress && (
            <MyRankCard progress={myProgress} name={myName} nivel={perfil?.nivel} />
          )}

          {/* Tabla de atletas + muro real de la comunidad */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {rest.length > 0 && (
              <div className="lg:col-span-7">
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="w-6 h-6 text-primary" />
                    <h3 className="text-lg font-bold text-[#e5e2e3]">Tabla de Atletas</h3>
                  </div>
                </div>
                <div className="bg-[#1c1b1c] rounded-xl overflow-hidden shadow-lg">
                  <div className="divide-y divide-white/5">
                    {rest.map((u) => (
                      <LeaderboardRow key={u.user_id} user={u} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className={rest.length > 0 ? 'lg:col-span-5' : 'lg:col-span-12'}>
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Rss className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-bold text-[#e5e2e3]">Muro de la Comunidad</h3>
                </div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#9ea3ae]">
                  Sugerencias
                </span>
              </div>
              <div className="bg-[#1c1b1c] rounded-xl p-5 shadow-lg">
                <SuggestionsSection compact />
              </div>
            </div>
          </section>
        </motion.div>
      )}
    </div>
  );
}
