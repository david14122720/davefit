import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Star } from 'lucide-react';

interface Suggestion {
  id?: string;
  message: string;
  rating: number;
  created_at: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function SuggestionsSection() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/suggestions?limit=10')
      .then(r => r.json())
      .then(data => {
        if (data.suggestions) setSuggestions(data.suggestions);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setFormMessage({ type: 'error', text: 'Por favor escribe tu sugerencia' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), rating }),
      });
      if (res.ok) {
        setFormMessage({ type: 'success', text: '¡Gracias por tu sugerencia!' });
        setMessage('');
        setRating(0);
        setSuggestions(prev => [
          { message: message.trim(), rating, created_at: new Date().toISOString() },
          ...prev,
        ]);
      } else {
        const data = await res.json();
        setFormMessage({ type: 'error', text: data.error || 'Error al enviar' });
      }
    } catch {
      setFormMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFormMessage(null), 5000);
    }
  };

  return (
    <section className="py-20 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <MessageCircle className="w-4 h-4" />
            Tu Opinión Importa
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            ¿Qué te gustaría ver en <span className="text-primary">DaveFit</span>?
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Comparte tus ideas, sugerencias o reporta problemas. Ayúdanos a mejorar la plataforma para todos.
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-background-card border border-white/10">
          {/* Star Rating */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Valoración</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star === rating ? 0 : star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-all focus:outline-none"
                  aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-7 h-7 transition-all ${
                      (hoverRating || rating) >= star
                        ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]'
                        : 'text-gray-500 hover:text-yellow-400/50'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Tu sugerencia</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Escribe aquí tu sugerencia, idea o reporte..."
              rows={4}
              maxLength={1000}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary transition-all resize-none"
            />
            <p className="text-xs text-gray-500 mt-1 text-right">{message.length}/1000</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary hover:bg-primary-light text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,107,0,0.3)] hover:shadow-[0_0_30px_rgba(255,107,0,0.5)]"
          >
            {submitting ? 'Enviando...' : 'Enviar Sugerencia'}
          </button>

          {/* Form Message */}
          <AnimatePresence>
            {formMessage && (
              <motion.div
                key="form-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-4 p-3 rounded-xl text-sm font-medium ${
                  formMessage.type === 'success'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {formMessage.text}
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Suggestions List */}
        <div className="mt-10">
          <h3 className="text-lg font-bold text-white mb-4">
            Sugerencias Recientes ({suggestions.length})
          </h3>
          {suggestions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Sé el primero en dar una sugerencia</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
              <AnimatePresence>
                {suggestions.map((s, i) => (
                  <motion.div
                    key={s.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-4 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              s.rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(s.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-300">{s.message}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
