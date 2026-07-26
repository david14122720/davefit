import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const META_CONFIG: Record<string, { title: string; description: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    description: 'Tu progreso fitness personalizado. Revisa tus estadísticas, avances y objetivos semanales en DaveFit.'
  },
  '/perfil': {
    title: 'Mi Perfil',
    description: 'Gestiona tu información personal, avatar, objetivos y preferencias de entrenamiento en DaveFit.'
  },
  '/rutinas': {
    title: 'Rutinas de Ejercicios',
    description: 'Explora y gestiona tus rutinas de fitness personalizadas. Entrenamientos sin equipo para estudiantes.'
  },
  '/comunidad': {
    title: 'Comunidad DaveFit',
    description: 'Conéctate con otros estudiantes, comparte logros y participa en desafíos fitness.'
  },
  '/nutricion': {
    title: 'Nutrición',
    description: 'Descubre recetas saludables y planes de alimentación para complementar tu entrenamiento en DaveFit.'
  },
  '/acerca-de': {
    title: 'Acerca de DaveFit',
    description: 'Conoce más sobre DaveFit, la plataforma de entrenamiento inteligente para estudiantes. Misión, beneficios y comunidad.'
  },
  '/biblioteca': {
    title: 'Biblioteca de Rutinas',
    description: 'Explora todas las rutinas de ejercicios y yoga. Entrena sin equipo, en casa, gratis.'
  },
  '/login': {
    title: 'Iniciar Sesión',
    description: 'Accede a tu cuenta de DaveFit para continuar tu viaje fitness.'
  },
  '/register': {
    title: 'Registro',
    description: 'Crea tu cuenta gratuita en DaveFit y comienza tu transformación fitness hoy mismo.'
  },
  '/admin': {
    title: 'Panel de Administración',
    description: 'Panel de control para administradores. Gestiona ejercicios, rutinas y contenido.'
  },
} as const;

/** Actualiza <title> y meta tags según la ruta actual. */
export default function MetaUpdater() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let meta = META_CONFIG[path];

    // Handle dynamic routes
    if (!meta) {
      if (path.startsWith('/yoga/practicar')) {
        meta = { title: 'Practicar Yoga', description: 'Sigue una sesión de yoga en tiempo real con instrucciones paso a paso.' };
      } else if (path.startsWith('/rutinas/practicar')) {
        meta = { title: 'Practicar Rutina', description: 'Entrenamiento en progreso. Sigue los ejercicios de tu rutina personalizada.' };
      } else if (path.startsWith('/admin/')) {
        meta = { title: 'Administración', description: 'Panel de administración de DaveFit.' };
      } else {
        meta = { title: 'DaveFit', description: 'Plataforma de entrenamiento inteligente para estudiantes.' };
      }
    }

    document.title = `${meta.title} | DaveFit`;

    const setMeta = (selector: string, attr: string, value: string) => {
      const tag = document.querySelector(selector);
      if (tag) tag.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('meta[property="og:title"]', 'content', `${meta.title} | DaveFit`);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[name="twitter:title"]', 'content', `${meta.title} | DaveFit`);
    setMeta('meta[name="twitter:description"]', 'content', meta.description);
  }, [location]);

  return null;
}
