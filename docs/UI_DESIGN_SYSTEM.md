# Phase — UI Design System (UI v3)

> **Status:** current, Nov 2026. Replaces every earlier design note (v1 purple/glass,
> "blue only", v2 cyan `#95DEE6` / lime `#DBF67F` / purple `#A59BCC`, Archivo /
> JetBrains Mono / General Sans / Satoshi). If a doc or comment disagrees with this
> file, this file wins.
>
> Visual companion: `docs/ui-design-sheet.html` (open in a browser — swatches,
> type specimens, components).

---

## 1. The idea in one paragraph

Phase looks like a **colourful, friendly, flat** app: a warm paper background, white
cards, **solid pastel colour blocks** with dark ink on them, a black ink accent for
the most important action, **big bold type**, pill shapes, and **soft, slow motion**
where nothing teleports. Premium comes from colour, structure and type, **never from
glow, shimmer, gradients or glass**. No purple, anywhere.

---

## 2. Colour

### 2.1 Palette (constant in both themes)

| Token | Surface | Ink on it | Role |
|---|---|---|---|
| **Lime** `--ph-lime` | `#D4F36B` | `#2B3A06` | Brand. Done / success / gains, completed habits, primary "positive" CTA (Log in, Claim) |
| **Sun** `--ph-sun` | `#FFD25E` | `#4A3500` | Category block — Morning, XP, Titles, Legendary |
| **Coral** `--ph-coral` | `#FF9F82` | `#4D1A0B` | Category block — Afternoon, Level, Animations |
| **Sky** `--ph-sky` | `#9DD3F7` | `#0B2E45` | Category block — Night, Focus, Banners, Rare, "This week" |
| **Pink** `--ph-pink` | `#F6B3CE` | `#4B1530` | Category block — Effects, Epic, Daily deal, avatar, + button |
| **Ink** `--ph-ink` | `#141416` | `#FFFFFF` | Strongest action, selected pills, nav active disc, Sanctum/Mythic, "at risk" streak card |
| **Red** `--ph-red` | `#B91C1C` | `#FFFFFF` | Destructive only (delete, abandon, drop zone), error icon disc |
| **Error block** `--ph-error-soft` | `#FFDAD4` | `#6B0F0F` | Error banners and error toasts (soft red block, see §5.1) |

**Rules**
- Pastels are **surfaces with their own ink on top**. Never use a pastel as text on
  paper/white (unreadable). If a rarity/category colour must be text, use its deep
  variant: rare `#1F6FA3`, epic `#B8436F`, legendary `#8A6A00`, lime `#4F6115`.
- Category colours are **identity, not decoration** — the same thing is always the same
  colour (Titles are always sun, Banners always sky, Morning always sun…).
- One screen can (and should) use several blocks — the app is meant to feel colourful.
- **No purple. No blue accents** (the only blue left is the "Blue Drift" timer screen,
  which is an item the user buys).

### 2.2 Theme surfaces (`--gm-*` tokens in `src/index.css`)

| Token | Light (default) | Dark | Use |
|---|---|---|---|
| `--gm-bg` | `#F5F4EF` paper | `#0E0E10` | Page background |
| `--gm-card` | `#FFFFFF` | `#1A1A1D` | Cards, inputs, tab pills |
| `--gm-badge` | `#F0EFE9` | `#26262A` | Icon wells, secondary buttons, "Next up" row |
| `--gm-track` | `#E3E3DF` | `#2A2A2F` | Progress tracks, hairlines, dividers |
| `--gm-checkbox` | `#CFCFCA` | `#4A4A50` | Empty checkbox ring |
| `--gm-ink` | `#141416` | `#F3F3F0` | Primary text, icons |
| `--gm-muted` | `#86868B` | `#8E8E93` | Secondary text, labels |
| `--ph-hero` | `#141416` | `#232327` | The dark "at risk" streak card (lifted in dark mode) |

- **Light is the default** (`localStorage.lightMode !== 'false'`). The Settings toggle
  cross-fades every colour (`html.theme-anim`, 0.7s).
- **Shadows:** none on cards (separation is by tone). Only the floating nav and the +
  button have a soft drop shadow (`--gm-shadow-nav`, `--gm-shadow-fab`).
- **Scoped re-tinting:** a coloured block sets `--gm-ink / --gm-muted / --gm-track`
  inline to its ink, so any child component automatically reads correctly on it.

### 2.3 Where each colour lives

| Area | Colours |
|---|---|
| Home stat tiles | XP today = sun · This week = sky · Level = coral |
| Habit sections | Morning = sun · Afternoon = coral · Night = sky · completed row = lime |
| Streak card | Done today = lime · Not done = ink (`--ph-hero`) |
| Focus Home | "Today's focus" hero = sky · tiles: all-time = sun, best streak = pink, shields = lime |
| Progress | Gems = sky · XP = sun · Tasks = lime |
| Level | Stat tiles sun / sky / pink; rank colour per `data/levels.js` |
| League | Your tier = its tier colour; rules tiles: move up = lime, group = card, move down = red |
| Shop (Game) | Sanctum = ink · Boxes = lime · Titles = sun · Banners = sky · Animations = coral · Effects = pink · Essentials = card |
| Shop (Focus) | Timer screens = sky · Sounds = pink · Upgrades = sun · Essentials = lime |
| Rarity | Common = badge grey · Rare = sky · Epic = pink · Legendary = sun · Mythic = ink (inverse) |
| Game ↔ Focus wipe | Game = lime · Focus = sky |

### 2.4 Rank ladder & league tiers (recoloured in UI v3)

Rank (`data/levels.js`): Rookie `#8C8C84` · Novice `#4FAEE6` · Apprentice `#2FA89A` ·
Adept `#7DBE3C` · Achiever `#E6B422` · Expert `#F2843A` · Master `#F06B5B` · Elite
`#E5484D` · Champion `#E85A9C` · Apex `#FFC23D` · Ascendant `#FF8FB8` · Mythic `#3D9BE9` ·
Celestial `#22C1D6` · Immortal `#FF7A3D` · Eternal `#EDEFF5`.

League (`data/leaderboardTiers.js`, fill / ink): Bronze `#D9915F` · Silver `#C3C8D2` ·
Gold `#FFD25E` · Platinum `#9DD3F7` · Nova `#7FE0C4` · Eclipse `#F6B3CE` · Zenith
`#FF9F82` · Vertex `#FF6B6B` · Apex `#D4F36B` · Prime `#141416` with gold `#FFD25E` ink.

---

## 3. Typography

Two families, loaded from Google Fonts in `src/index.css`. **Nothing thin.**

| Role | Family | Weight | Class |
|---|---|---|---|
| Display — titles, big numbers, tile names | **Bricolage Grotesque** | 800 | `.font-display` (letter-spacing −0.03em, tabular numbers) |
| UI — everything else | **Figtree** | body 600 · medium 600 · semibold 700 · bold 800 | default `font-sans` |
| Labels / small captions | Figtree | 700 | `.font-label` (sentence case — **no** uppercase, no tracking) |

Weights are remapped globally: `font-normal/light → 500`, `font-medium → 600`,
`font-semibold → 700`, `font-bold / extrabold / black → 800`.

### 3.1 Scale (Tailwind `fontSize`, `tailwind.config.js`)

| Token | Size / line-height | Typical use |
|---|---|---|
| `text-xs` | 13 / 18 | Fine print, chips |
| `text-sm` | 15 / 21 | Secondary text, descriptions |
| `text-base` | 17 / 25 | Body, habit names, list rows |
| `text-lg` | 19 / 27 | Emphasised body |
| `text-xl` | 22 / 29 | Section titles |
| `text-2xl` | 27 / 33 | Card titles |
| `text-3xl` | 32 / 38 | Page titles |
| `text-4xl` | 40 / 44 | Large headings |

### 3.2 Display sizes in use

| Size | Where |
|---|---|
| 60px | Streak number |
| 52px | Focus minutes, Shop title (sm+) |
| 44px | Shop title, success screen, mode wipe |
| 32px | Page titles (League, Shop, Focus Shop), section heroes |
| 26–30px | Current-league row, stat tile numbers, deal "−30%" |
| 20–22px | Section titles ("Morning", "All leagues", "Browse"), tile names, greeting |
| 17px | Habit names (bold) |

Labels next to big numbers: 12–14px Figtree 600–700 at ~70% of the block's ink.

---

## 4. Spacing & layout

4px base grid (Tailwind units).

| Thing | Value |
|---|---|
| Page side padding | 16px (`px-4`) · 24px from `sm` (`sm:px-6`) |
| Page top | 20px (`pt-5`) |
| Page bottom | 128px (`pb-32`) on mobile so content clears the floating nav; 40px on desktop |
| Max content width | 672px (`max-w-2xl`) for single-column pages · 768px (`max-w-3xl`) Shop / Home |
| Between sections | 24px (`space-y-6`) – 36px (`space-y-9`) |
| Section title → content | 12px (`mb-3`) |
| Card padding | 16px (`p-4`) · heroes 20px (`p-5`) · compact rows 12–14px |
| Grid gaps | 10px (`gap-2.5`) for tile grids · 12px (`gap-3`) for stat rows |
| Stack inside a card | 4–12px |
| Colour tiles | min-height 128px, icon top-left, name + caption bottom-left (`gap-6` between) |
| Tap targets | ≥ 40px (`h-10`); primary buttons 48px (`h-12`) |
| Back button | 40px pill, top-left, 8px above the page title |

### 4.1 Radii

| Element | Radius |
|---|---|
| Section heroes, streak card, dialogs, success sheets | 28px |
| Cards, colour tiles, stat tiles, habit rows | 24px (`rounded-2xl` = 24px in UI v3) |
| Inner wells, list rows | 18–22px |
| Buttons, chips, tabs, inputs, nav, avatars, badges | full pill / circle |

`rounded-xl` = 18px, `rounded-2xl` = 24px, `rounded-3xl` = 32px (overridden in Tailwind).

### 4.2 Navigation

- **Mobile:** a floating pill, centred, 24px above the bottom edge, 6px inner padding,
  44px circular items, white on light / charcoal on dark. The active item is a solid
  ink disc that **slides** between icons; its icon turns filled.
- **Desktop (md+):** an 80px left rail in the card colour, same sliding pill.
- **+ button** (Home): 56px pink circle, bottom-right above the nav.

---

## 5. Components

| Component | Spec | File |
|---|---|---|
| **Card** | `--gm-card`, radius 24, no border, no shadow | everywhere |
| **Colour tile** | solid category colour + ink, radius 24, min-h 128, Phosphor icon 30px fill top-left, name 20–21px display, caption 13–14px @75% | Shop Browse, Focus Shop Browse |
| **Section hero** | the tile it grew from, full width, radius 28, "← Shop home", 32px title, blurb, 44px icon right | ShopView, FocusShopPage |
| **BackButton** | 40px pill, arrow + "Back"; variants `default` (card), `ghost` (transparent), `solid` (ink) | `components/BackButton.js` |
| **Tabs** | row of card-coloured pills; the active one gets an ink pill that slides (`layoutId`) | Shop, Focus Shop, Progress |
| **Primary button** | 48px pill, ink bg + paper text (or lime + lime ink for "positive" flows like Log in) | — |
| **Secondary button** | 40px pill, `--gm-badge` bg, ink text ("Use this") | — |
| **"In use"/done chip** | lime pill with ✓ | Focus Shop, shop sheets |
| **Stat tile** | colour block, big display number top, small label bottom | Home, Progress, Level, Focus Home |
| **Habit row** | full colour block in its time-slot colour; 38px round checkbox; bold 17px name; meta line 13px; completed → lime with ink check that pops in | HomePage |
| **Streak card** | radius 28; 60px number; 7 round day dots M–S (done = lime on ink card / ink on lime card); milestone pill bottom-right | StreakCard |
| **Progress ring / bar** | 6–9px stroke on `--gm-track`, round caps, **fills from 0** on mount | Home, Focus Home, Level, Quests, Settings |
| **Status band** | one sentence telling the user exactly what to do (lime = good, red = danger, card = neutral) | LeagueView |
| **League emblem** | flat badge: circle (Bronze–Gold) → hexagon (Platinum–Eclipse) → shield (Zenith–Apex) → star (Prime); Phosphor glyph crown / diamond / fire / trophy; 1–3 pips; locked = grey + lock | TierEmblem |
| **Item preview** | titles on paper; banners as art; **motion rings on a dark `#141416` stage** (rings are drawn light) | ShopPieces, Inventory |
| **Sheet / dialog** | radius 28, slides up and scales in (0.5s), Back pill top-left | ItemSheet, BoxDetailModal |
| **Success screen** | lime wipe from the centre, check draws itself, title rises, bar fills, fades away ~2s | `components/auth/SuccessSplash.js` |
| **Mode wipe** | full-screen lime (Game) / sky (Focus) circle wipe with the mode name — only on a real switch | DashboardLayout |

### 5.1 Errors

Every error tells the user **what happened** and **what to do**, in the app's own style
(never a browser bubble — forms use `noValidate`).

| Piece | Spec |
|---|---|
| **Error banner** (`AuthError`) | soft red block `--ph-error-soft #FFDAD4`, ink `#6B0F0F`, radius 22, 16px padding; 36px solid red `#B91C1C` disc with a white warning icon; **title** 16px Figtree 800 ("Wrong email or password"); **detail** 14px 600 @80% ("Check both for typos — or tap Forgot? to reset"). Slides down + a small shake (0.45s), `role="alert"`. |
| **Field error** (`AuthField error`) | 2px red ring + faint red wash on the input (`--ph-error-wash`), and under it a 14px bold line with a filled warning icon in `--ph-error-text` (`#B91C1C` light / `#FF8F85` dark). `error={true}` = ring only (used when the banner already explains). |
| **Error toast** | same soft red block as the banner (sonner `error`), red icon, bold title, optional description. |
| **Copy** | `lib/authErrors.js` → `friendlyAuthError(err, ctx)` returns `{ title, detail, field }`; `checkEmail` / `checkPassword` run before any request so typos get an instant, specific message ("This email is missing an @."). |

Note: Supabase answers a wrong email AND a wrong password with the same "Invalid login
credentials" on purpose (no account probing). The app says "Wrong email or password",
highlights both fields and points to "Forgot?" — it never guesses which one.

---

## 6. Icons

- **Phosphor**, imported only through `components/icons` (bold by default,
  `variant="solid"` → fill). Lucide names used in old code map to Phosphor glyphs.
- Sizes: 18–22px in lists and buttons, 30px in tiles, 42–44px in heroes.
- Icons take the ink of the block they sit on. No emoji as UI.
- Performance: deep-import each icon (`@phosphor-icons/react/dist/csr/Name`).
  Never import icons into App.js, contexts or ErrorBoundary (first-load bundle).

---

## 7. Motion

Library: `framer-motion` (lazy screens only). Tokens: `src/lib/motion.js`.

| Token | Value |
|---|---|
| `EASE` | `cubic-bezier(0.22, 1, 0.36, 1)` — ease-out-quint, fast start, long soft landing |
| `DUR` | fast 0.3s · base 0.5s · slow 0.65s |
| `SPRING` | stiffness 260, damping 30 — sliding pills and nav disc |

| Pattern | Behaviour |
|---|---|
| Page change (dashboard) | **instant** swap + 14px glide, 0.22s, in nav direction (no exit delay) |
| Top-level route (landing → login → app) | CSS `.route-fade` 0.25s (no JS library on first load) |
| Go *into* something | the tapped card **grows into** the next view (shared `layoutId`): Browse tile → section hero, box card → box detail |
| Tabs / nav | active pill slides between items (spring) |
| Lists | children stagger in (fade-up 22px, 40–80ms apart) |
| Scroll | sections and rows reveal once as they enter (fade-up 26px) |
| Numbers | bars and rings fill from zero (0.9–1.3s) |
| Panels | profile panel slides in from the side (desktop) / bottom (mobile) and back out |
| Completion | row colour cross-fades 0.7s, check pops with a spring |
| Theme switch | every colour cross-fades 0.7s |
| Reduced motion | `MotionConfig reducedMotion="user"` + CSS media queries switch it off |

**Never:** glow, shimmer sweeps on non-bar elements, orbiting particles, neon pulses,
gradient text. Motion explains where you went; it doesn't decorate.

---

## 8. Organisation rules

1. **Every non-root screen and every modal has a Back button top-left.** One tap = one
   step back (section → shop home → app home).
2. **No endless stacked pages.** Big screens have a *home view* plus sections that open
   one at a time (Shop, Focus Shop).
3. **The most important thing is first.** League opens on the full ladder with your
   tier highlighted; Focus Home opens on today's focus and a Start button.
4. **Customisation lives with the thing it customises.** Focus timer screens and
   sounds are equipped in Focus Shop → Your setup, not in Settings.
5. **Tell the user what to do.** Status lines are one plain sentence ("145 XP to the
   promotion zone", "Your group is still filling up").

---

## 9. Screen map

| Screen | Top → bottom |
|---|---|
| **Home (Game)** | greeting + avatar + gems · stat tiles (sun/sky/coral) · revive/boost chips · streak card · daily quests · Morning / Afternoon / Night colour rows · pink + |
| **Home (Focus)** | greeting + gems · **Today's focus** (minutes, ring, Up next + Start) · tiles (all-time / best streak / shields) · streak card · quests · habit rows with Begin |
| **Progress** | title · daily/weekly/monthly sliding pill · stat tiles · chart-type pills · chart card |
| **Level** | current rank card + XP bar · stat tiles · "The Climb" list |
| **League** | title + reset chip · **All leagues** table (you highlighted) · status band · rules tiles · standings with cut-off lines |
| **Shop (Game)** | Back · drop label + title + gems · restock clock · tabs · **home:** wishlist, collection, today's drop, Browse tiles, how it works · **sections:** Sanctum, Boxes, Titles, Banners, Animations, Effects, Essentials |
| **Shop (Focus)** | Back · title + gems · **Your setup** · Browse tiles · how to earn · sections: Timer screens, Sounds, Upgrades, Essentials |
| **Settings** | profile · progress · all-time stats · public profile · privacy · (Focus: link to Your setup) · app experience · notifications · legal · account |
| **Auth** | logo · big title · Google · email fields (white pills) · lime primary button → success screen |

---

## 10. Do / Don't

| Do | Don't |
|---|---|
| Solid pastel blocks with their own ink | Pastel text on paper |
| Bold display type, big numbers | Thin or light weights, uppercase mono labels |
| Pills and 24–28px rounded blocks | Sharp corners, hairline-bordered boxes |
| Tone separation (white on paper) | Drop shadows on cards, glass, blur |
| Slow, purposeful motion (0.3–0.65s) | Glow, shimmer, neon, gradient text, diagonal gradients |
| Same colour = same meaning everywhere | Purple, random accent colours |
| Back button on every sub-screen | Dead ends that need the nav to escape |

---

## 11. Files

| What | Where |
|---|---|
| Tokens, fonts, global weight remap, nav, theme fade | `frontend/src/index.css` |
| Type scale, radii, font family | `frontend/tailwind.config.js` |
| Motion tokens | `frontend/src/lib/motion.js` |
| Icons | `frontend/src/components/icons/index.js` |
| Back button | `frontend/src/components/BackButton.js` |
| Success screen | `frontend/src/components/auth/{AuthSplashHost,SuccessSplash}.js` |
| League emblem / tiers | `frontend/src/components/TierEmblem.js`, `src/data/leaderboardTiers.js` |
| Rank colours | `frontend/src/data/levels.js` |
| Shop rarity colours | `frontend/src/components/shop/shopModel.js` |
| Visual sheet | `docs/ui-design-sheet.html` |
