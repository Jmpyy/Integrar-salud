import { useState, useEffect } from 'react';
import { Star, MessageSquareQuote } from 'lucide-react';
import { motion } from 'framer-motion';

function StarDisplay({ rating }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <Star 
          key={s} 
          size={16} 
          className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} 
        />
      ))}
    </div>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const API = import.meta.env.VITE_API_BASE_URL || 'https://control.integrarsalud.me/api-integrar/api';

  useEffect(() => {
    fetch(`${API}/reviews`)
      .then(res => res.json())
      .then(data => {
        if (!data.error && data.data) {
          setReviews(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [API]);

  if (loading || reviews.length === 0) return null;

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-white/50" />
      
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-bold mb-6"
          >
            <MessageSquareQuote size={16} />
            Experiencias Reales
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight"
          >
            Lo que dicen nuestros <span className="text-indigo-600">pacientes</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review, idx) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/20 flex flex-col h-full"
            >
              <div className="mb-6">
                <StarDisplay rating={Number(review.rating)} />
              </div>
              
              <div className="flex-1">
                {review.comment ? (
                  <p className="text-slate-600 leading-relaxed italic text-lg font-medium">
                    "{review.comment}"
                  </p>
                ) : (
                  <p className="text-slate-400 italic">Excelente atención.</p>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-sm font-bold text-slate-900">
                  Atendido por Dr/a. {review.doctor_name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(review.created_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
