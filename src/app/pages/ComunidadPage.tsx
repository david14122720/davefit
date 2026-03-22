import React, { useState, useEffect, useMemo } from 'react';
import { insforge } from '../../lib/insforge';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaderboardUser {
  rank: number;
  user_id: string;
  username: string;
  avatar_url?: string;
  streak_days: number;
  total_score: number;
  total_workouts: number;
}

type FilterType = 'weekly' | 'monthly' | 'all';

const PODIUM_COLORS = {
  1: { bg: 'from-amber-400/20 to-amber-600/10', border: 'border-yellow-500', crown: 'text-yellow-400', text: 'text-yellow-400' },
  2: { bg: 'from-gray-400/20 to-gray-500/10', border: 'border-gray-400', crown: 'text-gray-300', text: 'text-gray-300' },
  3: { bg: 'from-orange-600/20 to-orange-700/10', border: 'border-orange-600', crown: 'text-orange-500', text: 'text-orange-500' },
};

const Avatar = ({ src, name, size = 'md' }: { src?: string; name: string; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-16 h-16 text-lg' };
  
  if (src) {
    return <img src={src} alt={name || 'Usuario'} className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white/20`} />;
  }
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center font-bold text-black ring-2 ring-white/20`}>
      {(name || 'U').charAt(0).toUpperCase()}
    </div>
  );
};

const FlameIcon = ({ count, size = 'md' }: { count: number; size?: 'sm' | 'md' }) => {
  const sizeClasses = size === 'sm' ? 'text-sm' : 'text-lg';
  return (
    <div className={`flex items-center gap-1 ${sizeClasses}`}>
      <span className="text-orange-500">🔥</span>
      <span className="font-bold text-white">{count}</span>
      <span className="text-gray-400 text-xs">días</span>
    </div>
  );
};

const TrophyIcon = () => (
  <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C9.5 2 7.5 4 7.5 6.5V7H5C3.9 7 3 7.9 3 9v1c0 2.2 1.8 4 4 4h.2c.5 1.8 2 3.1 3.8 3.1V19H8v2h8v-2h-3v-1.9c1.8 0 3.3-1.3 3.8-3.1H17c2.2 0 4-1.8 4-4V9c0-1.1-.9-2-2-2h-2.5v-.5C16.5 4 14.5 2 12 2zM5 10v-.5h1.5V10H5zm13.5 0V9.5H17V10h1.5z"/>
  </svg>
);

const CrownIcon = () => (
  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
  </svg>
);

const PodiumCard = ({ user, position }: { user: LeaderboardUser; position: 1 | 2 | 3 }) => {
  const colors = PODIUM_COLORS[position];
  const isFirst = position === 1;
  
  return (
    <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: position * 0.1 }}
        whileHover={{ scale: isFirst ? 1.15 : 1.1 }}
        className={`relative flex flex-col items-center p-4 rounded-3xl bg-gradient-to-b ${colors.bg} border ${colors.border} ${isFirst ? 'scale-110 z-10 shadow-[0_0_30px_rgba(255,165,0,0.3)]' : ''} cursor-pointer group`}
    >
      {isFirst && (
        <div className={`absolute -top-6 ${colors.crown} animate-bounce`}>
          <CrownIcon />
        </div>
      )}
      
      <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md rounded-full px-2 py-0.5 text-xs font-bold text-white z-10">
        #{position}
      </div>
      
      <Avatar src={user.avatar_url} name={user.username} size={isFirst ? 'lg' : 'md'} />
      
      <h3 className="mt-3 font-bold text-white text-sm truncate max-w-[100px]">
        {user.username}
      </h3>
      
      <FlameIcon count={user.streak_days} size={isFirst ? 'md' : 'sm'} />
      
      <div className="mt-2 px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.2)]">
        <span className="text-orange-400 font-bold text-sm">{user.total_score.toLocaleString()}</span>
        <span className="text-gray-400 text-[10px] ml-1 uppercase">pts</span>
      </div>
    </motion.div>
  );
};

const LeaderboardRow = ({ user }: { user: LeaderboardUser }) => {
  const getRankColor = (rank: number) => {
    if (rank <= 3) return 'text-yellow-400';
    if (rank <= 10) return 'text-orange-400';
    return 'text-gray-400';
  };
  
  return (
    <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.05)' }}
        className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 transition-colors cursor-pointer group"
    >
      <div className={`w-8 text-center font-black ${getRankColor(user.rank)}`}>
        #{user.rank}
      </div>
      
      <Avatar src={user.avatar_url} name={user.username} size="sm" />
      
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white truncate group-hover:text-orange-400 transition-colors">
          {user.username}
        </div>
      </div>
      
      <FlameIcon count={user.streak_days} size="sm" />
      
      <div className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-xl group-hover:bg-orange-500/20 transition-colors">
        <span className="text-orange-400 font-bold">{user.total_score.toLocaleString()}</span>
      </div>
    </motion.div>
  );
};


export default function ComunidadPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [filter]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const scoreColumn = filter === 'weekly' ? 'weekly_score' : filter === 'monthly' ? 'monthly_score' : 'total_score';
      
      const { data, error } = await insforge.database
        .from('perfiles')
        .select(`
          id,
          nombre_completo,
          avatar_url,
          user_stats(
            streak_days,
            total_score,
            total_workouts,
            weekly_score,
            monthly_score
          )
        `);

      if (error) {
        console.error('Error loading leaderboard:', error);
        return;
      }

      if (data && data.length > 0) {
        const leaderboardUsers: LeaderboardUser[] = data.map((profile: any) => {
            const stats = Array.isArray(profile.user_stats) ? profile.user_stats[0] : profile.user_stats;
            const score = stats?.[scoreColumn] || stats?.total_score || 0;

            return {
                rank: 0,
                user_id: profile.id,
                username: profile.nombre_completo?.split(' ')[0] || 'Atleta',
                avatar_url: profile.avatar_url,
                streak_days: stats?.streak_days || 0,
                total_score: score,
                total_workouts: stats?.total_workouts || 0,
            };
        });

        // Sort dynamically based on filter column
        const sorted = leaderboardUsers.sort((a, b) => b.total_score - a.total_score);
        
        // Add ranks
        sorted.forEach((u, i) => { u.rank = i + 1; });
        
        setUsers(sorted);
      }
    } catch (e) {
      console.error('Exception loading leaderboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const top3 = useMemo(() => users.slice(0, 3), [users]);
  const rest = useMemo(() => users.slice(3), [users]);

  const FilterButton = ({ type, label }: { type: FilterType; label: string }) => (
    <button
      onClick={() => setFilter(type)}
      className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
        filter === type
          ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]'
          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <header className="flex flex-col items-center justify-center gap-3 mb-10 text-center">
        <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.2)]">
            <TrophyIcon />
        </div>
        <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Comunidad DaveFit</h1>
            <p className="text-gray-400 mt-2 font-medium">Compite, mejora e inspírate con otros estudiantes.</p>
        </div>
      </header>

      <div className="flex flex-wrap justify-center gap-3 mb-12">
        <FilterButton type="weekly" label="Esta Semana" />
        <FilterButton type="monthly" label="Este Mes" />
        <FilterButton type="all" label="Global" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
        <motion.div 
            key={filter}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
        >
          {users.length > 0 ? (
            <div className="mb-12">
                <div className="flex justify-center items-end gap-2 sm:gap-6 mb-8 mt-10">
                {top3[1] && <PodiumCard user={top3[1]} position={2} />}
                {top3[0] && <PodiumCard user={top3[0]} position={1} />}
                {top3[2] && <PodiumCard user={top3[2]} position={3} />}
                </div>
                
                <div className="max-w-md mx-auto bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-orange-500/0 p-4 text-center">
                <p className="text-orange-400 font-bold tracking-wide">
                    ¡Sigue así! El podio te espera 🔥
                </p>
                </div>
            </div>
            ) : null}

          {rest.length > 0 ? (
            <div className="space-y-3 max-w-2xl mx-auto">
                <h2 className="text-xl font-extrabold text-white mb-4 pl-2">Clasificación General</h2>
                <div className="flex flex-col gap-3">
                    <AnimatePresence>
                        {rest.map((user) => (
                        <LeaderboardRow key={user.user_id} user={user} />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
          ) : users.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium">No hay usuarios en la tabla.</div>
          ) : null}

          <div className="mt-12 max-w-2xl mx-auto p-6 bg-[#141414]/90 backdrop-blur-xl border border-white/5 rounded-2xl text-center">
            <p className="text-gray-400 text-sm font-medium">
              Completa workouts para ganar puntos y subir en el ranking. Los puntos se actualizan automáticamente de forma segura mediante políticas en tiempo real.
            </p>
            <div className="inline-flex mt-4 items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-xl border border-orange-500/20">
                <span className="text-orange-500">🔥</span>
                <span className="text-white font-bold text-sm">Cada workout finalizado = +10 puntos a tu racha</span>
            </div>
          </div>
        </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
