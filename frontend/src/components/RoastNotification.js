import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, X, Zap } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function RoastNotification() {
  const [roasts, setRoasts] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await axios.get(`${API}/roasts/check`);
        if (data.roasts?.length > 0) {
          setRoasts(data.roasts.map((r, i) => ({ id: Date.now() + i, text: r })));
        }
      } catch { /* ignore */ }
    };
    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const dismiss = (id) => setDismissed(prev => new Set(prev).add(id));
  const visible = roasts.filter(r => !dismissed.has(r.id));

  return (
    <div className="fixed top-4 right-4 z-[9998] flex flex-col gap-2 max-w-sm" data-testid="roast-container">
      <AnimatePresence>
        {visible.map(roast => (
          <motion.div
            key={roast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="roast-toast"
            data-testid="roast-notification"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(27,106,228,0.2)' }}>
                <Flame className="w-4 h-4 text-[#4D8EF0]" />
              </div>
              <p className="text-sm text-white/90 leading-snug flex-1 pt-0.5">{roast.text}</p>
              <button onClick={() => dismiss(roast.id)} className="p-1 text-white/30 hover:text-white/70 transition-colors flex-shrink-0" data-testid="roast-dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Standalone function to fire an immediate roast toast (for abandon session etc)
export function fireRoast(text) {
  const event = new CustomEvent('phase-roast', { detail: { text } });
  window.dispatchEvent(event);
}

export function RoastListener() {
  const [roasts, setRoasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      setRoasts(prev => [...prev, { id: Date.now(), text: e.detail.text }]);
    };
    window.addEventListener('phase-roast', handler);
    return () => window.removeEventListener('phase-roast', handler);
  }, []);

  const dismiss = (id) => setRoasts(prev => prev.filter(r => r.id !== id));

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {roasts.map(roast => (
          <motion.div
            key={roast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="roast-toast"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <Zap className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-sm text-white/90 leading-snug flex-1 pt-0.5">{roast.text}</p>
              <button onClick={() => dismiss(roast.id)} className="p-1 text-white/30 hover:text-white/70 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
