import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { insforge } from '../../lib/insforge';
import { queryWithRetry } from '../../lib/db';
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

const PODIUM_COLORS = {
  1: { bg: 'from-amber-400/20 to-amber-600/10', border: 'border-yellow-500', crown: 'text-yellow-400', text: 'text-yellow-400' },
  2: { bg: 'from-gray-400/20 to-gray-500/10', border: 'border-gray-400', crown: 'text-gray-300', text: 'text-gray-300' },
  3: { bg: 'from-green-600/20 to-green-700/10', border: 'border-green-600', crown: 'text-green-500', text: 'text-green-500' },
};

const Avatar = ({ src, name, size = 'md' }: { src?: string; name: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const sizeClasses = { sm: 'w-10 h-10 text-sm', md: 'w-14 h-14 text-base', lg: 'w-20 h-20 text-xl', xl: 'w-24 h-24 text-2xl' };
  
  if (src) {
    return <img src={src} alt={name || 'Usuario'} className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white/20`} />;
  }
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-linear-to-br from-primary to-green-600 flex items-center justify-center font-bold text-black ring-2 ring-white/20`}>
      {(name || 'U').charAt(0).toUpperCase()}
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
        className={`relative flex flex-col items-center rounded-xl bg-linear-to-b ${colors.bg} border ${colors.border} cursor-pointer group
          ${isFirst 
            ? 'sm:scale-110 z-10 shadow-[0_0_30px_rgba(255,165,0,0.3)] w-full max-w-[280px] sm:max-w-none sm:w-auto p-6 sm:p-4' 
            : 'w-full max-w-[240px] sm:max-w-none sm:w-auto p-5 sm:p-4'
          }`}
    >
      {isFirst && (
        <div className={`absolute -top-8 sm:-top-6 ${colors.crown} animate-bounce`}>
          <CrownIcon />
        </div>
      )}
      
      <div className="absolute top-3 right-3 sm:top-2 sm:right-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1 sm:px-2 sm:py-0.5 text-sm sm:text-xs font-bold text-white z-10">
        #{position}
      </div>
      
      <Avatar src={user.avatar_url} name={user.username} size={isFirst ? 'xl' : 'lg'} />
      
      <h3 className="mt-4 sm:mt-3 font-bold text-white text-base sm:text-sm truncate max-w-[160px] sm:max-w-[100px]">
        {user.username}
      </h3>
      
      <div className="mt-3 sm:mt-2 px-4 py-1.5 sm:px-3 sm:py-1 bg-primary/20 border border-primary/30 rounded-full shadow-[0_0_10px_rgba(255,107,0,0.2)]">
        <span className="text-green-400 font-bold text-base sm:text-sm">{user.total_score.toLocaleString()}</span>
        <span className="text-gray-400 text-xs sm:text-[10px] ml-1 uppercase">pts</span>
      </div>
    </motion.div>
  );
};

const LeaderboardRow = ({ user }: { user: LeaderboardUser }) => {
  const getRankColor = (rank: number) => {
    if (rank <= 3) return 'text-yellow-400';
    if (rank <= 10) return 'text-green-400';
    return 'text-gray-400';
  };
  
  return (
    <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.05)' }}
        className="flex items-center gap-3 sm:gap-3 p-4 sm:p-3 rounded-2xl bg-white/5 border border-white/5 transition-colors cursor-pointer group"
    >
      <div className={`w-10 sm:w-8 text-center font-black text-base sm:text-sm ${getRankColor(user.rank)}`}>
        #{user.rank}
      </div>
      
      <Avatar src={user.avatar_url} name={user.username} size="md" />
      
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-base sm:text-sm truncate group-hover:text-primary transition-colors">
          {user.username}
        </div>
      </div>
      
      <div className="px-4 py-1.5 sm:px-3 sm:py-1 bg-primary/10 border border-primary/20 rounded-xl group-hover:bg-primary/20 transition-colors">
        <span className="text-green-400 font-bold text-base sm:text-sm">{user.total_score.toLocaleString()}</span>
      </div>
    </motion.div>
  );
};


export default function ComunidadPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data: perfilesData, error: pError } = await queryWithRetry<any[]>(() =>
        insforge.database.from('perfiles').select('id, nombre_completo, avatar_url')
      );

      if (pError) {
        console.error('Error loading perfiles:', pError);
        setError('No pudimos acceder a los datos de la comunidad en este momento.');
        return;
      }

      const { data: statsData, error: sError } = await queryWithRetry<any[]>(() =>
        insforge.database.from('user_stats').select('*')
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
                streak_days: stats?.streak_days || 0,
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

  const top3 = useMemo(() => users.slice(0, 3), [users]);
  const rest = useMemo(() => users.slice(3), [users]);

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4">
      <header className="flex flex-col items-center justify-center gap-4 mb-10 text-center">
        <div className="w-16 h-16 bg-primary/10 border border-primary/20 text-primary rounded-lg flex items-center justify-center shadow-[0_0_40px_rgba(255,107,0,0.15)] ring-1 ring-primary/20">
            <TrophyIcon />
        </div>
        <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Comunidad <span className="text-primary">DaveFit</span></h1>
            <p className="text-gray-400 mt-2 font-medium max-w-sm sm:max-w-none">Domina el ranking y alcanza la cima del Olimpo.</p>
        </div>
      </header>

      {error ? (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center p-8 bg-[#141414] border border-red-500/20 rounded-3xl mt-12 shadow-[0_10px_40px_rgba(239,68,68,0.1)]"
        >
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Conexión Caída</h3>
            <p className="text-gray-400 mb-6 text-sm">{error}</p>
            <button 
                onClick={loadLeaderboard}
                className="px-6 py-3 bg-red-500 hover:bg-red-400 transition-colors text-white font-bold rounded-xl text-sm w-full shadow-lg shadow-red-500/20"
            >
                Reintentar
            </button>
        </motion.div>
      ) : loading ? (
        <div className="w-full flex flex-col items-center animate-pulse">
            <div className="flex flex-col sm:flex-row justify-center items-end gap-4 mb-20 mt-10 w-full px-4">
                <div className="w-32 sm:w-40 h-48 bg-[#1a1a1a] border border-white/5 rounded-4xl order-2 sm:order-1" />
                <div className="w-40 sm:w-48 h-64 bg-linear-to-t from-primary/10 to-[#1a1a1a] border border-primary/20 rounded-[2.5rem] order-1 sm:order-2" />
                <div className="w-32 sm:w-40 h-40 bg-[#1a1a1a] border border-white/5 rounded-4xl order-3 sm:order-3" />
            </div>
            <div className="max-w-2xl w-full space-y-4">
                <div className="h-6 w-48 bg-white/5 rounded-lg mb-6" />
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-full h-20 bg-white/5 rounded-2xl flex items-center px-4 gap-4">
                        <div className="w-8 h-8 rounded-md bg-white/5" />
                        <div className="w-12 h-12 rounded-full bg-white/10" />
                        <div className="flex-1">
                            <div className="w-32 h-4 bg-white/10 rounded-md mb-2" />
                        </div>
                        <div className="w-20 h-8 rounded-xl bg-primary/10" />
                    </div>
                ))}
            </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`w-full`}
        >
          {users.length > 0 ? (
            <div className="mb-12">
                <div className="flex flex-col sm:flex-row justify-center items-center sm:items-end gap-8 sm:gap-4 lg:gap-8 mb-8 mt-10 w-full">
                    <div className="order-2 sm:order-1 w-full flex justify-center sm:w-auto">{top3[1] && <PodiumCard user={top3[1]} position={2} />}</div>
                    <div className="order-1 sm:order-2 w-full flex justify-center sm:w-auto">{top3[0] && <PodiumCard user={top3[0]} position={1} />}</div>
                    <div className="order-3 sm:order-3 w-full flex justify-center sm:w-auto">{top3[2] && <PodiumCard user={top3[2]} position={3} />}</div>
                </div>
                
                <div className="max-w-md mx-auto bg-linear-to-r from-primary/0 via-primary/10 to-primary/0 p-4 text-center">
                <p className="text-green-400 font-bold tracking-wide">
                    ¡Sigue así! El podio te espera 🔥
                </p>
                </div>
            </div>
            ) : null}

          {rest.length > 0 ? (
            <div className="space-y-3 max-w-2xl mx-auto">
                <h2 className="text-xl font-bold text-white mb-4 pl-2">Clasificación General</h2>
                <div className="flex flex-col gap-3">
                    <AnimatePresence>
                        {rest.map((user: LeaderboardUser) => (
                        <LeaderboardRow key={user.user_id} user={user} />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
          ) : users.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium">No hay usuarios en la tabla.</div>
          ) : null}
        </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
