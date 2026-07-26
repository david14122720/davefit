import { Gift, Home, Leaf, Zap, Users, Smartphone } from 'lucide-react';

export const BenefitsGrid = () => {
  const benefits = [
    {
      title: "100% Gratis",
      desc: "Sin costos, sin suscripciones. Acceso total para todos.",
      icon: Gift,
    },
    {
      title: "Sin Equipo Necesario",
      desc: "Todo lo que necesitas es un poco de espacio y tu propio peso corporal.",
      icon: Home,
    },
    {
      title: "Alivio del Estrés",
      desc: "Despeja tu mente antes de los exámenes con fitness enfocado en mindfulness.",
      icon: Leaf,
    },
    {
      title: "Aumento de Energía",
      desc: "Ráfagas cortas e intensas para despertarte antes de una clase a las 8am.",
      icon: Zap,
    },
    {
      title: "Desafíos Comunitarios",
      desc: "Compite con amigos y domina los tableros de clasificación.",
      icon: Users,
    },
    {
      title: "Cualquier Dispositivo",
      desc: "Laptop, tablet o teléfono. Lleva tu gimnasio donde vayas.",
      icon: Smartphone,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {benefits.map((item) => {
        const IconComponent = item.icon;
        return (
          <div
            key={item.title}
            className="p-6 rounded-2xl bg-background-card border border-white/5 flex gap-4 hover:bg-white/5 hover:border-primary/30 transition-all hover:shadow-[0_0_20px_rgba(255,107,0,0.15)] group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold flex-shrink-0 shadow-[0_0_15px_rgba(255,107,0,0.4)] group-hover:shadow-[0_0_25px_rgba(255,107,0,0.6)] transition-all">
              <IconComponent size={24} strokeWidth={2} />
            </div>
            <div>
              <h4 className="font-bold mb-1 text-white">{item.title}</h4>
              <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
