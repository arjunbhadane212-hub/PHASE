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
// Per-icon deep imports keep the bundle to just the glyphs we use.
import { ArrowClockwise as PhArrowClockwise } from '@phosphor-icons/react/dist/csr/ArrowClockwise';
import { ArrowCounterClockwise as PhArrowCounterClockwise } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise';
import { ArrowDown as PhArrowDown } from '@phosphor-icons/react/dist/csr/ArrowDown';
import { ArrowLeft as PhArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { ArrowRight as PhArrowRight } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { ArrowSquareOut as PhArrowSquareOut } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
import { ArrowUp as PhArrowUp } from '@phosphor-icons/react/dist/csr/ArrowUp';
import { ArrowUpRight as PhArrowUpRight } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { Barbell as PhBarbell } from '@phosphor-icons/react/dist/csr/Barbell';
import { Bell as PhBell } from '@phosphor-icons/react/dist/csr/Bell';
import { Brain as PhBrain } from '@phosphor-icons/react/dist/csr/Brain';
import { CalendarBlank as PhCalendarBlank } from '@phosphor-icons/react/dist/csr/CalendarBlank';
import { CalendarCheck as PhCalendarCheck } from '@phosphor-icons/react/dist/csr/CalendarCheck';
import { CaretDoubleDown as PhCaretDoubleDown } from '@phosphor-icons/react/dist/csr/CaretDoubleDown';
import { CaretDoubleUp as PhCaretDoubleUp } from '@phosphor-icons/react/dist/csr/CaretDoubleUp';
import { CaretDown as PhCaretDown } from '@phosphor-icons/react/dist/csr/CaretDown';
import { CaretLeft as PhCaretLeft } from '@phosphor-icons/react/dist/csr/CaretLeft';
import { CaretRight as PhCaretRight } from '@phosphor-icons/react/dist/csr/CaretRight';
import { CaretUp as PhCaretUp } from '@phosphor-icons/react/dist/csr/CaretUp';
import { ChartBar as PhChartBar } from '@phosphor-icons/react/dist/csr/ChartBar';
import { ChartLine as PhChartLine } from '@phosphor-icons/react/dist/csr/ChartLine';
import { ChartLineUp as PhChartLineUp } from '@phosphor-icons/react/dist/csr/ChartLineUp';
import { ChartPie as PhChartPie } from '@phosphor-icons/react/dist/csr/ChartPie';
import { ChatCircle as PhChatCircle } from '@phosphor-icons/react/dist/csr/ChatCircle';
import { Check as PhCheck } from '@phosphor-icons/react/dist/csr/Check';
import { CheckSquare as PhCheckSquare } from '@phosphor-icons/react/dist/csr/CheckSquare';
import { CircleNotch as PhCircleNotch } from '@phosphor-icons/react/dist/csr/CircleNotch';
import { Clock as PhClock } from '@phosphor-icons/react/dist/csr/Clock';
import { Columns as PhColumns } from '@phosphor-icons/react/dist/csr/Columns';
import { Confetti as PhConfetti } from '@phosphor-icons/react/dist/csr/Confetti';
import { Crown as PhCrown } from '@phosphor-icons/react/dist/csr/Crown';
import { Diamond as PhDiamond } from '@phosphor-icons/react/dist/csr/Diamond';
import { DotsThreeVertical as PhDotsThreeVertical } from '@phosphor-icons/react/dist/csr/DotsThreeVertical';
import { Eye as PhEye } from '@phosphor-icons/react/dist/csr/Eye';
import { EyeSlash as PhEyeSlash } from '@phosphor-icons/react/dist/csr/EyeSlash';
import { FileText as PhFileText } from '@phosphor-icons/react/dist/csr/FileText';
import { Fire as PhFire } from '@phosphor-icons/react/dist/csr/Fire';
import { Flag as PhFlag } from '@phosphor-icons/react/dist/csr/Flag';
import { FlagBanner as PhFlagBanner } from '@phosphor-icons/react/dist/csr/FlagBanner';
import { GameController as PhGameController } from '@phosphor-icons/react/dist/csr/GameController';
import { GearSix as PhGearSix } from '@phosphor-icons/react/dist/csr/GearSix';
import { Globe as PhGlobe } from '@phosphor-icons/react/dist/csr/Globe';
import { GlobeHemisphereWest as PhGlobeHemisphereWest } from '@phosphor-icons/react/dist/csr/GlobeHemisphereWest';
import { Heartbeat as PhHeartbeat } from '@phosphor-icons/react/dist/csr/Heartbeat';
import { House as PhHouse } from '@phosphor-icons/react/dist/csr/House';
import { Lightning as PhLightning } from '@phosphor-icons/react/dist/csr/Lightning';
import { List as PhList } from '@phosphor-icons/react/dist/csr/List';
import { LockSimple as PhLockSimple } from '@phosphor-icons/react/dist/csr/LockSimple';
import { MagnifyingGlass as PhMagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { Medal as PhMedal } from '@phosphor-icons/react/dist/csr/Medal';
import { Minus as PhMinus } from '@phosphor-icons/react/dist/csr/Minus';
import { MoonStars as PhMoonStars } from '@phosphor-icons/react/dist/csr/MoonStars';
import { Mountains as PhMountains } from '@phosphor-icons/react/dist/csr/Mountains';
import { Package as PhPackage } from '@phosphor-icons/react/dist/csr/Package';
import { PencilSimple as PhPencilSimple } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { Play as PhPlay } from '@phosphor-icons/react/dist/csr/Play';
import { Plus as PhPlus } from '@phosphor-icons/react/dist/csr/Plus';
import { Prohibit as PhProhibit } from '@phosphor-icons/react/dist/csr/Prohibit';
import { Question as PhQuestion } from '@phosphor-icons/react/dist/csr/Question';
import { Rocket as PhRocket } from '@phosphor-icons/react/dist/csr/Rocket';
import { ShieldCheck as PhShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { ShieldWarning as PhShieldWarning } from '@phosphor-icons/react/dist/csr/ShieldWarning';
import { ShoppingBag as PhShoppingBag } from '@phosphor-icons/react/dist/csr/ShoppingBag';
import { SignOut as PhSignOut } from '@phosphor-icons/react/dist/csr/SignOut';
import { Sparkle as PhSparkle } from '@phosphor-icons/react/dist/csr/Sparkle';
import { SpeakerHigh as PhSpeakerHigh } from '@phosphor-icons/react/dist/csr/SpeakerHigh';
import { SpeakerX as PhSpeakerX } from '@phosphor-icons/react/dist/csr/SpeakerX';
import { Square as PhSquare } from '@phosphor-icons/react/dist/csr/Square';
import { StarFour as PhStarFour } from '@phosphor-icons/react/dist/csr/StarFour';
import { Sun as PhSun } from '@phosphor-icons/react/dist/csr/Sun';
import { SunHorizon as PhSunHorizon } from '@phosphor-icons/react/dist/csr/SunHorizon';
import { Tag as PhTag } from '@phosphor-icons/react/dist/csr/Tag';
import { Target as PhTarget } from '@phosphor-icons/react/dist/csr/Target';
import { Trash as PhTrash } from '@phosphor-icons/react/dist/csr/Trash';
import { TrendDown as PhTrendDown } from '@phosphor-icons/react/dist/csr/TrendDown';
import { TrendUp as PhTrendUp } from '@phosphor-icons/react/dist/csr/TrendUp';
import { Trophy as PhTrophy } from '@phosphor-icons/react/dist/csr/Trophy';
import { User as PhUser } from '@phosphor-icons/react/dist/csr/User';
import { UsersThree as PhUsersThree } from '@phosphor-icons/react/dist/csr/UsersThree';
import { Warning as PhWarning } from '@phosphor-icons/react/dist/csr/Warning';
import { X as PhX } from '@phosphor-icons/react/dist/csr/X';

export * from 'lucide-react';

// ── UI v3: Phosphor icon set (bold by default, fill for "solid") ─────────────
// Chunky, rounded, friendly — matches the color-block UI. Every icon the app
// imports from here (Phase concepts AND the lucide UI names it uses) is now a
// Phosphor glyph; anything unmapped still falls back to lucide via export *.
function ph(PIcon, displayName, defaultWeight = 'bold') {
  const Icon = forwardRef(function Icon(
    { size = 24, color = 'currentColor', variant, weight, strokeWidth, fill, absoluteStrokeWidth, className, style, title, ...rest },
    ref,
  ) {
    const w = weight || (variant === 'solid' ? 'fill' : defaultWeight);
    return <PIcon ref={ref} size={size} color={color} weight={w} className={className} style={style} aria-hidden={title ? undefined : true} {...rest} />;
  });
  Icon.displayName = displayName;
  return Icon;
}

export const GemIcon = ph(PhDiamond, 'GemIcon');
export const FlameIcon = ph(PhFire, 'FlameIcon');
export const BoltIcon = ph(PhLightning, 'BoltIcon');
export const XpIcon = ph(PhStarFour, 'XpIcon');
export const ShieldIcon = ph(PhShieldCheck, 'ShieldIcon');
export const ReviveIcon = ph(PhHeartbeat, 'ReviveIcon');
export const BoxIcon = ph(PhPackage, 'BoxIcon');
export const LevelIcon = ph(PhMountains, 'LevelIcon');
export const CrownIcon = ph(PhCrown, 'CrownIcon');
export const TrophyIcon = ph(PhTrophy, 'TrophyIcon');
export const MedalIcon = ph(PhMedal, 'MedalIcon');
export const SparkleIcon = ph(PhSparkle, 'SparkleIcon');
export const TitleIcon = ph(PhTag, 'TitleIcon');
export const BannerIcon = ph(PhFlagBanner, 'BannerIcon');
export const MotionIcon = ph(PhConfetti, 'MotionIcon');
export const ClockIcon = ph(PhClock, 'ClockIcon');
export const LockIcon = ph(PhLockSimple, 'LockIcon');
export const BellIcon = ph(PhBell, 'BellIcon');
export const CalendarIcon = ph(PhCalendarBlank, 'CalendarIcon');
export const HomeIcon = ph(PhHouse, 'HomeIcon');
export const ProgressIcon = ph(PhChartBar, 'ProgressIcon');
export const ShopIcon = ph(PhShoppingBag, 'ShopIcon');
export const SettingsIcon = ph(PhGearSix, 'SettingsIcon');
export const UserIcon = ph(PhUser, 'UserIcon');

// lucide-name overrides → Phosphor (shadow the `export *` above)
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
export const AlertTriangle = ph(PhWarning, 'AlertTriangle');
export const ArrowDown = ph(PhArrowDown, 'ArrowDown');
export const ArrowLeft = ph(PhArrowLeft, 'ArrowLeft');
export const ArrowRight = ph(PhArrowRight, 'ArrowRight');
export const ArrowUp = ph(PhArrowUp, 'ArrowUp');
export const ArrowUpRight = ph(PhArrowUpRight, 'ArrowUpRight');
export const Ban = ph(PhProhibit, 'Ban');
export const Brain = ph(PhBrain, 'Brain');
export const CalendarCheck = ph(PhCalendarCheck, 'CalendarCheck');
export const Check = ph(PhCheck, 'Check');
export const CheckSquare = ph(PhCheckSquare, 'CheckSquare');
export const ChevronDown = ph(PhCaretDown, 'ChevronDown');
export const ChevronRight = ph(PhCaretRight, 'ChevronRight');
export const ChevronLeft = ph(PhCaretLeft, 'ChevronLeft');
export const ChevronUp = ph(PhCaretUp, 'ChevronUp');
export const ChevronsDown = ph(PhCaretDoubleDown, 'ChevronsDown');
export const ChevronsUp = ph(PhCaretDoubleUp, 'ChevronsUp');
export const Columns3 = ph(PhColumns, 'Columns3');
export const Dumbbell = ph(PhBarbell, 'Dumbbell');
export const Edit2 = ph(PhPencilSimple, 'Edit2');
export const ExternalLink = ph(PhArrowSquareOut, 'ExternalLink');
export const Eye = ph(PhEye, 'Eye');
export const EyeOff = ph(PhEyeSlash, 'EyeOff');
export const FileText = ph(PhFileText, 'FileText');
export const Flag = ph(PhFlag, 'Flag');
export const Gamepad2 = ph(PhGameController, 'Gamepad2');
export const Globe = ph(PhGlobe, 'Globe');
export const Globe2 = ph(PhGlobeHemisphereWest, 'Globe2');
export const HelpCircle = ph(PhQuestion, 'HelpCircle');
export const Loader2 = ph(PhCircleNotch, 'Loader2');
export const LogOut = ph(PhSignOut, 'LogOut');
export const Menu = ph(PhList, 'Menu');
export const MessageSquare = ph(PhChatCircle, 'MessageSquare');
export const Minus = ph(PhMinus, 'Minus');
export const Moon = ph(PhMoonStars, 'Moon');
export const MoreVertical = ph(PhDotsThreeVertical, 'MoreVertical');
export const PieChart = ph(PhChartPie, 'PieChart');
export const Play = ph(PhPlay, 'Play');
export const Plus = ph(PhPlus, 'Plus');
export const Rocket = ph(PhRocket, 'Rocket');
export const RotateCcw = ph(PhArrowCounterClockwise, 'RotateCcw');
export const RotateCw = ph(PhArrowClockwise, 'RotateCw');
export const Search = ph(PhMagnifyingGlass, 'Search');
export const ShieldAlert = ph(PhShieldWarning, 'ShieldAlert');
export const Square = ph(PhSquare, 'Square');
export const Sun = ph(PhSun, 'Sun');
export const Sunrise = ph(PhSunHorizon, 'Sunrise');
export const Target = ph(PhTarget, 'Target');
export const Trash2 = ph(PhTrash, 'Trash2');
export const TrendingDown = ph(PhTrendDown, 'TrendingDown');
export const TrendingUp = ph(PhTrendUp, 'TrendingUp');
export const Users = ph(PhUsersThree, 'Users');
export const Volume2 = ph(PhSpeakerHigh, 'Volume2');
export const VolumeX = ph(PhSpeakerX, 'VolumeX');
export const X = ph(PhX, 'X');
export const AreaChartIcon = ph(PhChartLineUp, 'AreaChartIcon');
export const BarChart = ph(PhChartBar, 'BarChart');
export const LineChart = ph(PhChartLine, 'LineChart');

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
