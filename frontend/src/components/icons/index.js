// The ONE place the app gets icons from.
//
// Every file imports icons from here, never from lucide-react directly. Game
// and navigation concepts (gem, flame, XP, shield, box, crown, clock, nav…)
// are Phase-drawn from components/icons/paths.js so they share one geometry.
// Plain UI affordances (chevrons, close, check, arrows, eye, spinner) come
// from lucide, which is drawn on the same 24px / 2px / round-cap grid, so the
// two halves sit together without a visible seam.
//
// Lucide names that collide with a Phase concept (Gem, Flame, Zap, Shield,
// Crown, Trophy, Star, Sparkles, Award, Clock, Lock, Home, Settings, User,
// Bell, Calendar, BarChart3, ShoppingBag, Heart…) are re-exported below as the
// Phase version, so an old `import { Gem } from '../components/icons'` gets the
// house mark automatically.
import { forwardRef } from 'react';
import { ICON_PATHS } from './paths';

export * from 'lucide-react';

const CUT_INK = 'rgba(0,0,0,0.38)';

function makeIcon(name, displayName) {
  const spec = ICON_PATHS[name];
  const Icon = forwardRef(function Icon(
    { size = 24, strokeWidth = 2, color = 'currentColor', variant = 'outline', className, style, title, ...rest },
    ref,
  ) {
    const solid = variant === 'solid';
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round"
        className={className} style={style}
        aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}
        focusable="false" data-icon={name}
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        {spec.d.map((d, i) => (
          <path key={`d${i}`} d={d} fill={solid && i === 0 ? color : 'none'} />
        ))}
        {spec.cut.map((d, i) => (
          <path key={`c${i}`} d={d} stroke={solid ? CUT_INK : color} />
        ))}
      </svg>
    );
  });
  Icon.displayName = displayName;
  return Icon;
}

// ── Phase concepts (primary names) ──────────────────────────────────────────
export const GemIcon      = makeIcon('gem', 'GemIcon');
export const FlameIcon    = makeIcon('flame', 'FlameIcon');
export const BoltIcon     = makeIcon('bolt', 'BoltIcon');
export const XpIcon       = makeIcon('xp', 'XpIcon');
export const ShieldIcon   = makeIcon('shield', 'ShieldIcon');
export const ReviveIcon   = makeIcon('revive', 'ReviveIcon');
export const BoxIcon      = makeIcon('box', 'BoxIcon');
export const LevelIcon    = makeIcon('level', 'LevelIcon');
export const CrownIcon    = makeIcon('crown', 'CrownIcon');
export const TrophyIcon   = makeIcon('trophy', 'TrophyIcon');
export const MedalIcon    = makeIcon('medal', 'MedalIcon');
export const SparkleIcon  = makeIcon('sparkle', 'SparkleIcon');
export const TitleIcon    = makeIcon('title', 'TitleIcon');
export const BannerIcon   = makeIcon('banner', 'BannerIcon');
export const MotionIcon   = makeIcon('motion', 'MotionIcon');
export const ClockIcon    = makeIcon('clock', 'ClockIcon');
export const LockIcon     = makeIcon('lock', 'LockIcon');
export const BellIcon     = makeIcon('bell', 'BellIcon');
export const CalendarIcon = makeIcon('calendar', 'CalendarIcon');
export const HomeIcon     = makeIcon('home', 'HomeIcon');
export const ProgressIcon = makeIcon('progress', 'ProgressIcon');
export const ShopIcon     = makeIcon('shop', 'ShopIcon');
export const SettingsIcon = makeIcon('settings', 'SettingsIcon');
export const UserIcon     = makeIcon('user', 'UserIcon');

// ── lucide-name overrides → Phase marks (shadow the `export *` above) ───────
export const Gem = GemIcon;
export const Flame = FlameIcon;
export const Zap = BoltIcon;
export const Shield = ShieldIcon;
export const ShieldCheck = ShieldIcon;
export const Crown = CrownIcon;
export const Trophy = TrophyIcon;
export const Award = MedalIcon;
export const Star = SparkleIcon;
export const Sparkles = SparkleIcon;
export const Clock = ClockIcon;
export const Lock = LockIcon;
export const Bell = BellIcon;
export const Calendar = CalendarIcon;
export const Home = HomeIcon;
export const BarChart3 = ProgressIcon;
export const ShoppingBag = ShopIcon;
export const Settings = SettingsIcon;
export const User = UserIcon;
export const Heart = ReviveIcon;
export const Frame = BannerIcon;
export const Hourglass = ReviveIcon;
export const Package = BoxIcon;

// Resolve a shop/consumable key to its icon (boosts, shields, revives, boxes).
export function itemIconFor(itemKey = '') {
  if (itemKey === 'streak_shield') return ShieldIcon;
  if (itemKey === 'streak_revive') return ReviveIcon;
  if (itemKey.startsWith('boost_xp_')) return BoltIcon;
  if (itemKey.startsWith('title_')) return TitleIcon;
  if (itemKey.startsWith('banner_')) return BannerIcon;
  if (itemKey.startsWith('anim_') || itemKey.startsWith('fx_')) return MotionIcon;
  return BoxIcon;
}
