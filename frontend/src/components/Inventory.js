// The one inventory.
//
// There used to be two: ProfileCustomizationSection in SettingsPage and the
// lower half of MyProfilePage. They were separate implementations of the same
// idea and they disagreed -- Settings had no Effects section at all, so buying
// a Profile Effect put a row in user_inventory that Settings simply never
// rendered. That is the "I bought it and it never showed up" bug: the purchase
// worked every time, one of the two screens just had no shelf to put it on.
//
// This component owns every equippable category in one place, so a category can
// never again exist on one surface and not the other. Both screens render this;
// neither owns a copy.
//
// It is also self-refreshing: equipping writes through equip_item and then
// re-reads, so the shelf and the server never drift apart.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Check, Gem } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import TitlePlate from './profile/TitlePlate';
import { PhaseBanner } from './banners/PhaseBanners';
import { animCssFor } from '../data/shopAnimations';
import { effectCssFor } from '../data/shopEffects';

const MONO = "font-['JetBrains_Mono'] uppercase tracking-[0.08em]";

const BANNER_KEY_TO_ART = {
  banner_circuit: 'starter_circuit',
  banner_grid: 'starter_grid',
  banner_pulse: 'delta_pulse',
  banner_void_fracture: 'delta_void',
};

// Every equippable category, in one list. Adding a category to the shop means
// adding exactly one row here and it appears on both surfaces at once.
const SECTIONS = [
  { id: 'title',  label: 'Titles',         userField: 'equipped_title' },
  { id: 'anim',   label: 'Animations',     userField: 'equipped_animation' },
  { id: 'banner', label: 'Banners',        userField: 'equipped_banner' },
  { id: 'effect', label: 'Profile Effects', userField: 'equipped_decoration' },
];

export default function Inventory({ onNavigate }) {
  const { user, refreshUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState('title');
  const [busy, setBusy] = useState(null);

  const fetchInventory = useCallback(async () => {
    try {
      const [{ data: items }, { data: inv }] = await Promise.all([
        supabase.from('shop_items')
          .select('id,key,name,category,rarity,rarity_tier,gradient_value,hex_value')
          .eq('is_active', true),
        supabase.from('user_inventory').select('shop_item_id,quantity'),
      ]);
      const ownedIds = new Set((inv || []).filter((r) => (r.quantity ?? 1) > 0).map((r) => r.shop_item_id));
      setRows((items || []).filter((i) => ownedIds.has(i.id)));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const byCat = useMemo(() => {
    const m = {};
    SECTIONS.forEach((s) => { m[s.id] = rows.filter((r) => r.category === s.id); });
    return m;
  }, [rows]);

  const equip = async (item) => {
    setBusy(`${item.category}-${item.key}`);
    try {
      const { error } = await supabase.rpc('equip_item', { p_shop_item_id: item.id });
      if (error) throw error;
      toast.success(`Equipped ${item.name}`);
      await Promise.all([refreshUser(), fetchInventory()]);
    } catch (e) {
      toast.error(e?.message || 'Could not equip');
    } finally { setBusy(null); }
  };

  const unequip = async (category) => {
    setBusy(`${category}-null`);
    try {
      const { error } = await supabase.rpc('unequip_item', { p_category: category });
      if (error) throw error;
      await Promise.all([refreshUser(), fetchInventory()]);
    } catch (e) {
      toast.error(e?.message || 'Could not remove');
    } finally { setBusy(null); }
  };

  const total = rows.length;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-[#95DEE6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="inventory">
      {total === 0 ? (
        <div className="rounded-2xl bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-card)] py-8 px-4 text-center">
          <p className="text-sm text-[color:var(--gm-muted)] mb-1">Your inventory is empty.</p>
          <p className="text-[11px] text-[color:var(--gm-muted)]">
            <Gem className="w-3 h-3 inline" /> Earn titles through streaks, or buy them in the{' '}
            <Link to="/dashboard/shop" onClick={onNavigate} className="font-semibold text-[color:var(--gm-ink)] hover:opacity-80">Shop</Link>.
          </p>
        </div>
      ) : (
        SECTIONS.map((sec) => {
          const items = byCat[sec.id] || [];
          const equippedKey = user?.[sec.userField];
          return (
            <Section
              key={sec.id}
              label={sec.label}
              count={items.length}
              expanded={open === sec.id}
              onToggle={() => setOpen(open === sec.id ? null : sec.id)}
            >
              {items.length === 0 ? (
                <p className="text-[11px] text-[color:var(--gm-muted)]">
                  None yet — find these in the <Link to="/dashboard/shop" onClick={onNavigate} className="font-semibold text-[color:var(--gm-ink)] hover:opacity-80">Shop</Link>.
                </p>
              ) : (
                <>
                  {equippedKey && (
                    <button onClick={() => unequip(sec.id)} disabled={busy === `${sec.id}-null`}
                      className="mb-2 inline-flex items-center px-2.5 h-7 rounded-full text-[11px] font-bold text-[#B91C1C] hover:bg-[#B91C1C]/10 transition-colors disabled:opacity-50"
                      data-testid={`inv-remove-${sec.id}`}>
                      Remove
                    </button>
                  )}
                  <div className={sec.id === 'title' ? 'flex flex-wrap gap-1.5' : 'grid grid-cols-2 gap-2'}>
                    {items.map((it) => (
                      <ItemTile key={it.key} item={it} category={sec.id}
                        equipped={equippedKey === it.key}
                        busy={busy === `${sec.id}-${it.key}`}
                        onEquip={() => equip(it)} />
                    ))}
                  </div>
                </>
              )}
            </Section>
          );
        })
      )}
    </div>
  );
}

function ItemTile({ item, category, equipped, busy, onEquip }) {
  // Titles render as their real chip -- the same component the profile uses --
  // so what you pick here is exactly what you will wear.
  if (category === 'title') {
    return (
      <button onClick={onEquip} disabled={equipped || busy}
        className={`inline-flex items-center gap-1.5 p-1 rounded-xl transition-all disabled:cursor-default ${
          equipped ? 'ring-1 ring-[#DBF67F]' : 'hover:brightness-110'}`}
        data-testid={`inv-title-${item.key}`}>
        <TitlePlate titleKey={item.key} name={item.name} tier={item.rarity_tier || 'common'} size="sm" />
        {equipped && <Check className="w-3 h-3 text-[#DBF67F] flex-none" strokeWidth={3} />}
      </button>
    );
  }

  const preview =
    category === 'banner' ? <PhaseBanner bannerKey={BANNER_KEY_TO_ART[item.key] || 'default'} />
    : category === 'anim' ? <div className={`w-7 h-7 rounded-full bg-[#95DEE6] ${animCssFor(item.key)}`} />
    : <div className={`w-7 h-7 rounded-full bg-[#95DEE6] ${effectCssFor(item.key)}`} />;

  return (
    <button onClick={onEquip} disabled={equipped || busy}
      className={`rounded-xl overflow-hidden text-left transition-all disabled:cursor-default ${
        equipped ? 'ring-1 ring-[#DBF67F]' : 'hover:brightness-110'}`}
      style={{ background: 'var(--gm-badge)' }}
      data-testid={`inv-${category}-${item.key}`}>
      <div className="h-12 flex items-center justify-center overflow-hidden">{preview}</div>
      <div className="px-2 py-1.5 flex items-center gap-1">
        <span className="text-[11px] font-['General_Sans'] font-bold text-[color:var(--gm-ink)] truncate flex-1">{item.name}</span>
        {equipped && <Check className="w-3 h-3 text-[#DBF67F] flex-none" strokeWidth={3} />}
      </div>
    </button>
  );
}

function Section({ label, count, expanded, onToggle, children }) {
  return (
    <div className="mb-2.5 rounded-2xl overflow-hidden bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-card)]">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2.5"
        data-testid={`inv-section-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        <span className="text-xs font-['General_Sans'] font-bold text-[color:var(--gm-ink)]">
          {label} <span className={`${MONO} text-[10px] text-[color:var(--gm-muted)] font-normal`}>{count}</span>
        </span>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-[color:var(--gm-muted)]" />
          : <ChevronDown className="w-4 h-4 text-[color:var(--gm-muted)]" />}
      </button>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
