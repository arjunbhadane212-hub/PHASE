import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { BellIcon } from '../icons';
import { enablePush, dismissPrimer, pushSupport } from '../../lib/push';

// Soft ask before the browser's permission prompt (asked right after a win,
// the way Duolingo asks after the first lesson). A "Not now" here costs
// nothing; a "Block" on the real browser prompt is permanent — so we only
// trigger the real prompt once the user has said yes to this one.
export default function PushPrimer({ streak = 0, onClose }) {
  const [busy, setBusy] = useState(false);
  const needsInstall = pushSupport() === 'needs-install';

  const yes = async () => {
    setBusy(true);
    try {
      await enablePush();
      toast.success('Reminders are on. We’ll only ping you when it matters.');
      onClose();
    } catch (e) {
      toast.error(e?.message || 'Could not turn on notifications');
      dismissPrimer();
      onClose();
    } finally {
      setBusy(false);
    }
  };
  const later = () => { dismissPrimer(); onClose(); };

  return (
    <motion.div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={later} />
      <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} role="dialog" aria-modal="true"
        className="relative w-full sm:max-w-sm bg-[var(--gm-card)] rounded-t-3xl sm:rounded-3xl p-6 pb-9 sm:pb-6" data-testid="push-primer">
        <span className="w-12 h-12 rounded-2xl bg-[#95DEE6] text-[#183A3F] flex items-center justify-center"><BellIcon size={24} /></span>
        <h3 className="font-['Archivo'] font-black text-[22px] text-[var(--gm-ink)] mt-4 tracking-[-0.01em]">
          {streak > 0 ? `Don’t lose your ${streak}-day streak by accident` : 'Want a nudge before your streak breaks?'}
        </h3>
        {needsInstall ? (
          <p className="text-sm text-[var(--gm-muted)] mt-2">On iPhone, reminders need Phase on your Home Screen: tap <b className="text-[var(--gm-ink)]">Share</b> → <b className="text-[var(--gm-ink)]">Add to Home Screen</b>, open Phase from there, then turn reminders on in Settings.</p>
        ) : (
          <p className="text-sm text-[var(--gm-muted)] mt-2">One reminder around the time you usually check in, and one if your streak is about to end. Never more than two a day. Turn them off any time in Settings.</p>
        )}
        <div className="mt-6 space-y-2">
          {!needsInstall && (
            <button type="button" onClick={yes} disabled={busy} className="w-full h-12 rounded-full bg-[#95DEE6] text-[#183A3F] font-['General_Sans'] font-bold disabled:opacity-50" data-testid="push-primer-yes">
              {busy ? 'Turning on…' : 'Turn on reminders'}
            </button>
          )}
          <button type="button" onClick={later} className="w-full h-12 rounded-full text-[var(--gm-muted)] font-['General_Sans'] font-bold" data-testid="push-primer-later">
            {needsInstall ? 'Got it' : 'Not now'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
