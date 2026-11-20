// UI v3 motion system — one place for every transition so the app moves as one.
// Slow-and-smooth by request: nothing should "teleport". Easing is an
// ease-out-quint (fast start, long soft landing), durations ~0.45–0.6s.
export const EASE = [0.22, 1, 0.36, 1];
export const EASE_IN = [0.64, 0, 0.78, 0];
export const DUR = { fast: 0.3, base: 0.5, slow: 0.65 };
export const SPRING = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 };
export const SPRING_SOFT = { type: 'spring', stiffness: 170, damping: 26 };

// Direction-aware page slide (custom = -1 | 0 | 1).
export const pageVariants = {
  initial: (dir = 0) => ({ opacity: 0, x: dir * 70, y: dir === 0 ? 24 : 0, scale: 0.985 }),
  animate: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: DUR.base, ease: EASE } },
  exit: (dir = 0) => ({ opacity: 0, x: dir * -50, y: dir === 0 ? -12 : 0, scale: 0.99, transition: { duration: DUR.fast, ease: EASE_IN } }),
};

// Fade-up for blocks entering a screen; stagger children with `staggerParent`.
export const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
};
export const staggerParent = (stagger = 0.06, delay = 0.05) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

// Scroll-reveal props for any motion element.
export const reveal = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '0px 0px -40px 0px' },
  transition: { duration: DUR.base, ease: EASE },
};

// Content swap inside a tab group (custom = direction).
export const swapVariants = {
  initial: (dir = 1) => ({ opacity: 0, x: dir * 40 }),
  animate: { opacity: 1, x: 0, transition: { duration: DUR.base, ease: EASE } },
  exit: (dir = 1) => ({ opacity: 0, x: dir * -40, transition: { duration: 0.25, ease: EASE_IN } }),
};
