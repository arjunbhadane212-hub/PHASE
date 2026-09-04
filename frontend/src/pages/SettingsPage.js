import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Separator } from '../components/ui/separator';
import { Lock, Bell, HelpCircle, FileText, LogOut, Eye, Gamepad2, Loader2, Edit2, ChevronRight, Palette, Check, ExternalLink, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { TitleBadge } from '../components/profile/FlexBadge';
import { rankInfo } from '../data/levels';

// v2 design system — shared with Progress / Level / Home.
// cyan #95DEE6 = active/selected, lime #DBF67F = progress, purple #A59BCC =
// outline-pill accent, red #B91C1C = destructive (all inlined below).
const LIME = '#DBF67F';
const SECTION_LABEL = "font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--gm-muted)]";
const CARD = 'rounded-2xl bg-[color:var(--gm-card)]';
const DIALOG = 'bg-[color:var(--gm-card)] text-[color:var(--gm-ink)] border-0';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { switchMode, isGameMode } = useMode();

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [switchModeDialogOpen, setSwitchModeDialogOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (e) {
      toast.error('Failed to log out');
    }
  };

  const handleSwitchMode = async () => {
    setLoading(true);
    try {
      const newMode = await switchMode();
      toast.success(`Switched to ${newMode === 'game' ? 'Game' : 'Focus'} Mode`);
      setSwitchModeDialogOpen(false);
    } catch (e) {
      toast.error('Failed to switch mode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-24 md:pb-8" data-testid="settings-page">
      <div className="max-w-2xl mx-auto animate-slide-up">
        <h1 className="text-xl sm:text-2xl font-['Archivo'] font-extrabold text-[color:var(--gm-ink)] tracking-[-0.01em] mb-4 sm:mb-6">
          Settings
        </h1>

        {/* Profile Section */}
        <section className="mb-6 sm:mb-8">
          <h2 className={`${SECTION_LABEL} mb-3 sm:mb-4`}>Profile</h2>
          <div className={CARD}>
            <div className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-lg sm:text-xl font-['Archivo'] font-black bg-[color:var(--gm-badge)] text-[color:var(--gm-ink)]">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-['General_Sans'] font-semibold text-[color:var(--gm-ink)] text-sm sm:text-base truncate">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs sm:text-sm text-[color:var(--gm-muted)] truncate">{user?.email}</p>
              </div>
              <EditProfileDialog
                user={user}
                open={editProfileOpen}
                onOpenChange={setEditProfileOpen}
                onSuccess={refreshUser}
              />
            </div>
            <Separator className="bg-[color:var(--gm-track)]" />
            <ChangePasswordDialog
              open={changePasswordOpen}
              onOpenChange={setChangePasswordOpen}
            />
          </div>
        </section>

        {/* Progress */}
        <ProgressSection isGameMode={isGameMode} />

        {/* All-Time Stats */}
        <section className="mb-6 sm:mb-8">
          <h2 className={`${SECTION_LABEL} mb-3 sm:mb-4`}>All-Time Stats</h2>
          <div className={`${CARD} p-3 sm:p-4`}>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {isGameMode && (
                <>
                  <div>
                    <p className="text-xs sm:text-sm text-[color:var(--gm-muted)]">Total XP</p>
                    <p className="text-lg sm:text-xl font-['Archivo'] font-black text-[color:var(--gm-ink)]">
                      {user?.total_xp_all_time || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-[color:var(--gm-muted)]">Highest Level</p>
                    <p className="text-lg sm:text-xl font-['Archivo'] font-black text-[color:var(--gm-ink)]">{user?.highest_level_reached || 1} — {rankInfo(user?.highest_level_reached || 1).name}</p>
                  </div>
                </>
              )}
              <div>
                <p className="text-xs sm:text-sm text-[color:var(--gm-muted)]">Longest Streak</p>
                <p className="text-lg sm:text-xl font-['Archivo'] font-black text-[color:var(--gm-ink)]">{user?.longest_streak_ever || 0} days</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-[color:var(--gm-muted)]">Habits Completed</p>
                <p className="text-lg sm:text-xl font-['Archivo'] font-black text-[color:var(--gm-ink)]">{user?.total_habits_completed || 0}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs sm:text-sm text-[color:var(--gm-muted)]">Member Since</p>
                <p className="text-sm sm:text-base text-[color:var(--gm-ink)]">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : '-'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Public Profile Link */}
        {user?.username && (
          <section className="mb-6">
            <Link
              to={`/profile/${user.username}`}
              className={`${CARD} p-4 flex items-center justify-between transition-colors hover:brightness-[0.97] block`}
              data-testid="view-profile-link"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-[color:var(--gm-muted)]" />
                <div>
                  <p className="text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">View Public Profile</p>
                  <p className="text-xs text-[color:var(--gm-muted)]">@{user.username}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[color:var(--gm-muted)]" />
            </Link>
          </section>
        )}

        {/* Profile Colors - Game Mode Only */}
        {isGameMode && <ColorSettingsSection />}

        {/* Profile Customization - Game Mode Only */}
        {isGameMode && <ProfileCustomizationSection />}

        {/* App Experience */}
        <section className="mb-8">
          <h2 className={`${SECTION_LABEL} mb-4`}>App Experience</h2>
          <div className={CARD}>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isGameMode ? (
                  <Gamepad2 className="w-5 h-5 text-[color:var(--gm-ink)]" />
                ) : (
                  <Eye className="w-5 h-5 text-[color:var(--gm-ink)]" />
                )}
                <div>
                  <p className="font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">
                    {isGameMode ? 'Game Mode' : 'Focus Mode'}
                  </p>
                  <p className="text-sm text-[color:var(--gm-muted)]">
                    {isGameMode ? 'Full gamified experience' : 'Clean, minimal interface'}
                  </p>
                </div>
              </div>
              <Dialog open={switchModeDialogOpen} onOpenChange={setSwitchModeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-full border-[#A59BCC] bg-transparent text-[color:var(--gm-ink)] hover:bg-[color:var(--gm-badge)]" data-testid="switch-mode-btn">
                    Switch
                  </Button>
                </DialogTrigger>
                <DialogContent className={DIALOG}>
                  <DialogHeader>
                    <DialogTitle className="font-['Archivo'] font-extrabold">Switch Mode?</DialogTitle>
                  </DialogHeader>
                  <p className="text-[color:var(--gm-muted)]">
                    Are you sure you want to switch to {isGameMode ? 'Focus' : 'Game'} Mode?
                    Your entire UI and features will change.
                  </p>
                  <DialogFooter className="mt-4">
                    <Button variant="ghost" onClick={() => setSwitchModeDialogOpen(false)} className="text-[color:var(--gm-muted)] hover:text-[color:var(--gm-ink)]">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSwitchMode}
                      disabled={loading}
                      className="bg-[#95DEE6] text-[#183A3F] hover:brightness-95"
                      data-testid="confirm-switch-mode-btn"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Switch Mode'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="mb-6 sm:mb-8">
          <h2 className={`${SECTION_LABEL} mb-3 sm:mb-4`}>Appearance</h2>
          <LightModeToggle />
        </section>

        {/* Notifications */}
        <section className="mb-6 sm:mb-8">
          <h2 className={`${SECTION_LABEL} mb-3 sm:mb-4`}>Notifications</h2>
          <NotificationSettings user={user} isGameMode={isGameMode} />
        </section>

        {/* Help & Support */}
        <section className="mb-6 sm:mb-8">
          <h2 className={`${SECTION_LABEL} mb-3 sm:mb-4`}>Help & Support</h2>
          <div className={CARD}>
            <SettingsLink icon={<HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />} label="Help Center" href="/help" />
            <Separator className="bg-[color:var(--gm-track)]" />
            <SettingsLink icon={<FileText className="w-4 h-4 sm:w-5 sm:h-5" />} label="FAQ" href="/faq" />
          </div>
        </section>

        {/* Legal */}
        <section className="mb-6 sm:mb-8">
          <h2 className={`${SECTION_LABEL} mb-3 sm:mb-4`}>Legal</h2>
          <div className={CARD}>
            <SettingsLink icon={<FileText className="w-4 h-4 sm:w-5 sm:h-5" />} label="Terms & Rights" href="/terms" />
            <Separator className="bg-[color:var(--gm-track)]" />
            <SettingsLink icon={<Lock className="w-4 h-4 sm:w-5 sm:h-5" />} label="Privacy Policy" href="/privacy" />
          </div>
        </section>

        {/* Log out */}
        <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start text-[#B91C1C] hover:text-[#B91C1C] hover:bg-[#B91C1C]/10"
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Log Out
            </Button>
          </DialogTrigger>
          <DialogContent className={DIALOG}>
            <DialogHeader>
              <DialogTitle className="font-['Archivo'] font-extrabold">Log Out?</DialogTitle>
            </DialogHeader>
            <p className="text-[color:var(--gm-muted)]">
              Are you sure you want to log out?
            </p>
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setLogoutDialogOpen(false)} className="text-[color:var(--gm-muted)] hover:text-[color:var(--gm-ink)]">
                Cancel
              </Button>
              <Button
                onClick={handleLogout}
                className="bg-[#B91C1C]/15 text-[#B91C1C] hover:bg-[#B91C1C]/25"
                data-testid="confirm-logout-btn"
              >
                Log Out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function SettingsLink({ icon, label, href }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between p-3 sm:p-4 hover:bg-[color:var(--gm-badge)] transition-colors"
    >
      <div className="flex items-center gap-2 sm:gap-3 text-[color:var(--gm-ink)]">
        {icon}
        <span className="text-sm sm:text-base font-['General_Sans']">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--gm-muted)]" />
    </a>
  );
}

function EditProfileDialog({ user, open, onOpenChange, onSuccess }) {
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ first_name: firstName, last_name: lastName })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('Profile updated');
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-[color:var(--gm-muted)] hover:text-[color:var(--gm-ink)]" data-testid="edit-profile-btn">
          <Edit2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[color:var(--gm-card)] text-[color:var(--gm-ink)] border-0">
        <DialogHeader>
          <DialogTitle className="font-['Archivo'] font-extrabold">Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-[color:var(--gm-muted)]">First Name</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-[color:var(--gm-badge)] border-0 text-[color:var(--gm-ink)]"
              data-testid="edit-firstname-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[color:var(--gm-muted)]">Last Name</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-[color:var(--gm-badge)] border-0 text-[color:var(--gm-ink)]"
              data-testid="edit-lastname-input"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-[color:var(--gm-muted)] hover:text-[color:var(--gm-ink)]">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#95DEE6] text-[#183A3F] hover:brightness-95"
              data-testid="save-profile-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({ open, onOpenChange }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Supabase Auth owns password management now. updateUser sets the new
      // password for the currently-authenticated user; it relies on a valid
      // (recent) session rather than verifying current_password.
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password changed');
      onOpenChange(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) {
      setError(e?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button className="w-full flex items-center justify-between p-4 hover:bg-[color:var(--gm-badge)] transition-colors text-left" data-testid="change-password-btn">
          <div className="flex items-center gap-3 text-[color:var(--gm-ink)]">
            <Lock className="w-5 h-5" />
            <span className="font-['General_Sans']">Change Password</span>
          </div>
          <ChevronRight className="w-5 h-5 text-[color:var(--gm-muted)]" />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[color:var(--gm-card)] text-[color:var(--gm-ink)] border-0">
        <DialogHeader>
          <DialogTitle className="font-['Archivo'] font-extrabold">Change Password</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="p-3 rounded-lg bg-[#B91C1C]/10 text-[#B91C1C] text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-[color:var(--gm-muted)]">Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-[color:var(--gm-badge)] border-0 text-[color:var(--gm-ink)]"
              data-testid="current-password-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[color:var(--gm-muted)]">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-[color:var(--gm-badge)] border-0 text-[color:var(--gm-ink)]"
              data-testid="new-password-input"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-[color:var(--gm-muted)] hover:text-[color:var(--gm-ink)]">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !currentPassword || !newPassword}
              className="bg-[#95DEE6] text-[#183A3F] hover:brightness-95"
              data-testid="save-password-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NotificationSettings({ user, isGameMode }) {
  const [settings, setSettings] = useState(user?.notification_settings || {
    push_enabled: true,
    reminders_enabled: true,
    roast_enabled: true
  });
  const [loading, setLoading] = useState(false);

  const handleToggle = async (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ notification_settings: newSettings })
        .eq('id', user.id);
      if (error) throw error;
    } catch (e) {
      // Revert on error
      setSettings(settings);
      toast.error(e?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-[color:var(--gm-card)]">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-[color:var(--gm-ink)]" />
          <div>
            <p className="font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">Push Notifications</p>
            <p className="text-sm text-[color:var(--gm-muted)]">Receive notifications on your device</p>
          </div>
        </div>
        <Switch
          checked={settings.push_enabled}
          onCheckedChange={() => handleToggle('push_enabled')}
          className="data-[state=checked]:bg-[#95DEE6]"
          data-testid="push-toggle"
        />
      </div>

      {settings.push_enabled && (
        <>
          <Separator className="bg-[color:var(--gm-track)]" />
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">Reminders</p>
              <p className="text-sm text-[color:var(--gm-muted)]">Habit reminders throughout the day</p>
            </div>
            <Switch
              checked={settings.reminders_enabled}
              onCheckedChange={() => handleToggle('reminders_enabled')}
              className="data-[state=checked]:bg-[#95DEE6]"
              data-testid="reminders-toggle"
            />
          </div>

          {/* Roast Mode - both modes */}
          <Separator className="bg-[color:var(--gm-track)]" />
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">Roast Mode</p>
              <p className="text-sm text-[color:var(--gm-muted)]">{isGameMode ? 'Competitive trash talk when you slack' : 'Quiet nudges when you miss sessions'}</p>
            </div>
            <Switch
              checked={settings.roast_enabled}
              onCheckedChange={() => handleToggle('roast_enabled')}
              className="data-[state=checked]:bg-[#95DEE6]"
              data-testid="roast-toggle"
            />
          </div>
        </>
      )}
    </div>
  );
}


function ProfileCustomizationSection() {
  const { refreshUser, user } = useAuth();
  const [owned, setOwned] = useState(null); // null = loading
  const [equipping, setEquipping] = useState(null);

  // Read owned equippables (title / anim / banner) from Supabase: shop_items +
  // user_inventory, joined client-side (same pattern as ShopPage). Each item
  // carries its real shop_items.id so equip_item can be called by id.
  const fetchData = useCallback(async () => {
    try {
      const [{ data: items }, { data: inv }] = await Promise.all([
        supabase.from('shop_items').select('id,key,name,category,rarity,rarity_style,source_system,rarity_tier'),
        supabase.from('user_inventory').select('shop_item_id'),
      ]);
      const ownedIds = new Set((inv || []).map((r) => r.shop_item_id));
      const mine = (items || []).filter((i) => ownedIds.has(i.id));
      setOwned({
        titles: mine.filter((i) => i.category === 'title'),
        anims: mine.filter((i) => i.category === 'anim'),
        banners: mine.filter((i) => i.category === 'banner'),
      });
    } catch { setOwned({ titles: [], anims: [], banners: [] }); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Canonical only: equip/unequip go through the RPCs (no direct users.equipped_*
  // writes). equip_item requires ownership; unequip_item clears the slot.
  const CAT = { title: 'title', animation: 'anim', banner: 'banner' };
  const handleEquip = async (type, item) => {
    setEquipping(`${type}-${item.key}`);
    try {
      const { error } = await supabase.rpc('equip_item', { p_shop_item_id: item.id });
      if (error) throw error;
      await Promise.all([refreshUser(), fetchData()]);
      toast.success(`${type} equipped!`);
    } catch (e) {
      toast.error(e?.message || 'Failed to equip');
    } finally { setEquipping(null); }
  };
  const handleUnequip = async (type) => {
    setEquipping(`${type}-null`);
    try {
      const { error } = await supabase.rpc('unequip_item', { p_category: CAT[type] });
      if (error) throw error;
      await Promise.all([refreshUser(), fetchData()]);
      toast.success(`${type} removed!`);
    } catch (e) {
      toast.error(e?.message || 'Failed');
    } finally { setEquipping(null); }
  };

  if (!owned) return null;

  const earnedTitles = owned.titles;
  const equippedTitle = user?.equipped_title;
  // Icons dormant: no 'icon' category in shop_items yet (future feature — see
  // NOTES_FOR_SACHIN.md). Always [] so the Icons block never renders / never calls.
  const ownedIcons = [];
  const ownedAnims = owned.anims;
  const ownedBanners = owned.banners;

  // Equipped chip = cyan "active" ring; unequipped = neutral badge.
  const chipCls = (active) =>
    `text-xs px-3 py-1 rounded-full transition-colors ${
      active ? 'bg-[color:var(--gm-badge)] ring-1 ring-[#95DEE6] text-[color:var(--gm-ink)]'
             : 'bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)] hover:text-[color:var(--gm-ink)]'
    }`;

  return (
    <section className="mb-6" data-testid="profile-customization">
      <h2 className={`${SECTION_LABEL} mb-3`}>Profile Customization</h2>

      {/* Titles */}
      {earnedTitles.length > 0 && (
        <div className={`${CARD} p-4 mb-3`}>
          <p className="text-sm text-[color:var(--gm-muted)] mb-2">Titles</p>
          <div className="flex flex-wrap gap-2">
            {equippedTitle && (
              <button onClick={() => handleUnequip('title')} className="text-xs px-3 py-1 rounded-full text-[#B91C1C] hover:bg-[#B91C1C]/10">Remove</button>
            )}
            {earnedTitles.map(t => (
              <button key={t.key} onClick={() => handleEquip('title', t)} disabled={equipping === `title-${t.key}`}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-xl transition-colors ${equippedTitle === t.key ? 'bg-[color:var(--gm-badge)] ring-1 ring-[#95DEE6]' : 'bg-[color:var(--gm-badge)] hover:brightness-95'}`}
                data-testid={`equip-title-${t.key}`}>
                <TitleBadge name={t.name} sourceSystem={t.source_system} style={t.rarity_style}
                  rarityTier={t.rarity_tier} rarity={t.rarity} size="sm" />
                {equippedTitle === t.key && <Check className="w-3 h-3 text-[color:var(--gm-ink)]" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Icons — DORMANT (future feature). No 'icon' category in shop_items and
          equip_item rejects it, so ownedIcons is always [] and this never renders
          or calls anything. Kept for when icons are added. See NOTES_FOR_SACHIN.md. */}
      {ownedIcons.length > 0 && (
        <div className={`${CARD} p-4 mb-3`}>
          <p className="text-sm text-[color:var(--gm-muted)] mb-2">Icons</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleEquip('icon', null)} className={chipCls(false)}>Default</button>
            {ownedIcons.map(i => (
              <button key={i.key} onClick={() => handleEquip('icon', i.key)} disabled={equipping === `icon-${i.key}`}
                className={chipCls(user?.equipped_icon === i.key)}>
                {i.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Animations */}
      {ownedAnims.length > 0 && (
        <div className={`${CARD} p-4 mb-3`}>
          <p className="text-sm text-[color:var(--gm-muted)] mb-2">Animations</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleUnequip('animation')} className={chipCls(false)}>None</button>
            {ownedAnims.map(a => (
              <button key={a.key} onClick={() => handleEquip('animation', a)} disabled={equipping === `animation-${a.key}`}
                className={chipCls(user?.equipped_animation === a.key)}>
                {a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Banners */}
      {ownedBanners.length > 0 && (
        <div className={`${CARD} p-4 mb-3`}>
          <p className="text-sm text-[color:var(--gm-muted)] mb-2">Banners</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleUnequip('banner')} className={chipCls(false)}>Default</button>
            {ownedBanners.map(b => (
              <button key={b.key} onClick={() => handleEquip('banner', b)} disabled={equipping === `banner-${b.key}`}
                className={chipCls(user?.equipped_banner === b.key)}>
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {earnedTitles.length === 0 && ownedIcons.length === 0 && ownedAnims.length === 0 && ownedBanners.length === 0 && (
        <div className={`${CARD} p-4 text-center text-sm text-[color:var(--gm-muted)]`}>
          No items to equip yet. Earn titles through streaks or buy items from the Shop!
        </div>
      )}
    </section>
  );
}


function LightModeToggle() {
  const [lightMode, setLightMode] = useState(() => localStorage.getItem('lightMode') === 'true');

  useEffect(() => {
    if (lightMode) {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [lightMode]);

  const handleToggle = () => {
    const next = !lightMode;
    setLightMode(next);
    localStorage.setItem('lightMode', String(next));
  };

  return (
    <div className={`${CARD} p-4 flex items-center justify-between`} data-testid="light-mode-toggle">
      <div className="flex items-center gap-3">
        {lightMode ? <Sun className="w-5 h-5 text-[color:var(--gm-ink)]" /> : <Moon className="w-5 h-5 text-[color:var(--gm-ink)]" />}
        <div>
          <p className="font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">Light Mode</p>
          <p className="text-sm text-[color:var(--gm-muted)]">{lightMode ? 'Light theme active' : 'Dark theme active'}</p>
        </div>
      </div>
      <Switch
        checked={lightMode}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-[#95DEE6]"
        data-testid="light-mode-switch"
      />
    </div>
  );
}


function ProgressSection({ isGameMode }) {
  const { user } = useAuth();
  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchProgress = async () => {
      try {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const weekday = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
        const weekStart = new Date(now);
        weekStart.setUTCDate(now.getUTCDate() - 6);
        const weekStartStr = weekStart.toISOString().slice(0, 10);

        const [{ data: habits }, { data: todayLog }, { data: weekLogs }] = await Promise.all([
          supabase.from('habits').select('repeat_schedule,custom_days').eq('user_id', user.id),
          supabase.from('daily_logs').select('habits_completed').eq('user_id', user.id).eq('log_date', todayStr).maybeSingle(),
          supabase.from('daily_logs').select('*').eq('user_id', user.id).gte('log_date', weekStartStr).lte('log_date', todayStr),
        ]);

        const scheduledToday = (habits || []).filter(h => {
          const s = h.repeat_schedule || 'daily';
          if (s === 'daily') return true;
          if (s === 'weekdays') return !['saturday', 'sunday'].includes(weekday);
          if (s === 'weekends') return ['saturday', 'sunday'].includes(weekday);
          const custom = Array.isArray(h.custom_days) ? h.custom_days.map(d => String(d).toLowerCase()) : [];
          return custom.includes(weekday);
        }).length;

        const completedToday = Array.isArray(todayLog?.habits_completed) ? todayLog.habits_completed.length : 0;
        setDaily({ completed_habits: completedToday, total_habits: scheduledToday });

        const logs = weekLogs || [];
        const total_xp = logs.reduce((s, l) => s + (l.xp_earned_today || 0), 0);
        const full_days = logs.filter(l => l.full_day_completion).length;
        const totalCompleted = logs.reduce((s, l) => s + (Array.isArray(l.habits_completed) ? l.habits_completed.length : 0), 0);
        // Approximate: today's scheduled count as the per-day baseline over 7 days
        const completion_rate = scheduledToday > 0 ? Math.min(100, Math.round((totalCompleted / (scheduledToday * 7)) * 100)) : 0;
        setWeekly({ completion_rate, total_xp, full_days });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [user?.id]);

  if (loading || !daily) return null;

  const todayPct = daily.total_habits > 0
    ? Math.round((daily.completed_habits / daily.total_habits) * 100)
    : 0;

  return (
    <section className="mb-6 sm:mb-8" data-testid="progress-section">
      <h2 className={`${SECTION_LABEL} mb-3 sm:mb-4`}>Progress</h2>
      <div className={`${CARD} p-4`}>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[color:var(--gm-muted)]">Today</span>
            <span className="font-['JetBrains_Mono'] font-bold text-[color:var(--gm-ink)]">{daily.completed_habits}/{daily.total_habits}</span>
          </div>
          <div className="h-2 bg-[color:var(--gm-track)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${todayPct}%`, backgroundColor: LIME }}
              data-testid="progress-today-bar"
            />
          </div>
        </div>

        {weekly && (
          <div className={`grid ${isGameMode ? 'grid-cols-3' : 'grid-cols-2'} gap-3 pt-3 border-t border-[color:var(--gm-track)]`}>
            <div>
              <p className="text-xs text-[color:var(--gm-muted)]">Completion Rate</p>
              <p className="text-lg font-['Archivo'] font-black text-[color:var(--gm-ink)]">{weekly.completion_rate}%</p>
            </div>
            {isGameMode && (
              <div>
                <p className="text-xs text-[color:var(--gm-muted)]">XP This Week</p>
                <p className="text-lg font-['Archivo'] font-black text-[color:var(--gm-ink)]">{weekly.total_xp}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[color:var(--gm-muted)]">Full Days</p>
              <p className="text-lg font-['Archivo'] font-black text-[color:var(--gm-ink)]">{weekly.full_days}/7</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}


function ColorSettingsSection() {
  const { user, refreshUser } = useAuth();
  const [colors, setColors] = useState(null);
  const [updating, setUpdating] = useState(null);

  // Read the color catalog + ownership from Supabase (shop_items color_main/
  // color_banner + user_inventory). Each color carries its shop_items.id; the
  // `selected` flag mirrors the users.selected_*_color column equip_item writes.
  const fetchColors = useCallback(async () => {
    try {
      const [{ data: items }, { data: inv }] = await Promise.all([
        supabase.from('shop_items').select('id,name,category,hex_value')
          .in('category', ['color_main', 'color_banner']),
        supabase.from('user_inventory').select('shop_item_id'),
      ]);
      const ownedIds = new Set((inv || []).map((r) => r.shop_item_id));
      const toColor = (i, selectedHex) => ({
        id: i.id, hex: i.hex_value, name: i.name,
        owned: ownedIds.has(i.id), selected: selectedHex === i.hex_value,
      });
      const rows = items || [];
      setColors({
        main_colors: rows.filter((i) => i.category === 'color_main').map((i) => toColor(i, user?.selected_main_color)),
        banner_colors: rows.filter((i) => i.category === 'color_banner').map((i) => toColor(i, user?.selected_banner_color)),
        selected_main: user?.selected_main_color,
        selected_banner: user?.selected_banner_color,
      });
    } catch { /* ignore -> section stays hidden */ }
  }, [user?.selected_main_color, user?.selected_banner_color]);

  useEffect(() => { fetchColors(); }, [fetchColors]);

  // Canonical only: owned swatch -> equip_item(id); Default (#1F2937) ->
  // unequip_item(category). No direct users.selected_*_color writes.
  const handleSelect = async (color, type) => {
    setUpdating(`${type}-${color.hex}`);
    try {
      const { error } = await supabase.rpc('equip_item', { p_shop_item_id: color.id });
      if (error) throw error;
      await Promise.all([refreshUser(), fetchColors()]);
      toast.success('Color updated!');
    } catch (e) {
      toast.error(e?.message || 'Failed to update');
    } finally { setUpdating(null); }
  };
  const handleReset = async (type) => {
    setUpdating(`${type}-#1F2937`);
    try {
      const { error } = await supabase.rpc('unequip_item', { p_category: type === 'banner' ? 'color_banner' : 'color_main' });
      if (error) throw error;
      await Promise.all([refreshUser(), fetchColors()]);
      toast.success('Color updated!');
    } catch (e) {
      toast.error(e?.message || 'Failed to update');
    } finally { setUpdating(null); }
  };

  if (!colors) return null;

  return (
    <section className="mb-6" data-testid="color-settings">
      <h2 className={`${SECTION_LABEL} mb-3`}>Profile Colors</h2>

      {/* Banner Color */}
      <div className="mb-4">
        <p className="text-sm text-[color:var(--gm-muted)] mb-2 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> Banner Color</p>
        <div className="flex flex-wrap gap-2">
          <ColorSwatch hex="#1F2937" name="Default" selected={colors.selected_banner === '#1F2937'} owned={true} onSelect={() => handleReset('banner')} updating={updating === 'banner-#1F2937'} />
          {colors.banner_colors.map(c => (
            <ColorSwatch key={c.hex} hex={c.hex} name={c.name} selected={c.selected} owned={c.owned} onSelect={() => c.owned && handleSelect(c, 'banner')} updating={updating === `banner-${c.hex}`} />
          ))}
        </div>
      </div>

      {/* Main Color */}
      <div>
        <p className="text-sm text-[color:var(--gm-muted)] mb-2 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> Main Color</p>
        <div className="flex flex-wrap gap-2">
          <ColorSwatch hex="#1F2937" name="Default" selected={colors.selected_main === '#1F2937'} owned={true} onSelect={() => handleReset('main')} updating={updating === 'main-#1F2937'} />
          {colors.main_colors.map(c => (
            <ColorSwatch key={c.hex} hex={c.hex} name={c.name} selected={c.selected} owned={c.owned} onSelect={() => c.owned && handleSelect(c, 'main')} updating={updating === `main-${c.hex}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ColorSwatch({ hex, name, selected, owned, onSelect, updating }) {
  return (
    <button
      onClick={onSelect}
      disabled={!owned || updating}
      title={owned ? name : `${name} (Unlock in Shop)`}
      className={`w-8 h-8 rounded-full border-2 transition-all relative ${
        selected ? 'border-[#95DEE6] scale-110' : owned ? 'border-[color:var(--gm-track)] hover:scale-105' : 'border-[color:var(--gm-track)] opacity-40 cursor-not-allowed'
      }`}
      style={{ backgroundColor: hex }}
      data-testid={`color-swatch-${hex}`}
    >
      {selected && <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />}
      {!owned && <Lock className="w-3 h-3 text-white/60 absolute inset-0 m-auto" />}
    </button>
  );
}
