// Shop item marks — thin adapter over the ONE icon set (components/icons).
// Kept so existing callers (box opening, shop) resolve a key to its mark
// without knowing which concept it maps to.
import { itemIconFor, SparkleIcon as Sparkle } from './icons';

export function ShopItemIcon({ itemKey = '', className, size, variant }) {
  const Icon = itemIconFor(itemKey);
  return <Icon className={className} size={size} variant={variant} />;
}

export function SparkleIcon({ className }) {
  return <Sparkle className={className} />;
}

// The tile colour a consumable sits on (cyan = utility, lime = XP/energy).
export function shopItemTone(itemKey = '') {
  if (itemKey.startsWith('boost_xp_')) return { bg: '#D4F36B', ink: '#2B3A06' };
  return { bg: '#D4F36B', ink: '#2B3A06' };
}
