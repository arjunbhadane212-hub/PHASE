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
import { Lock, Bell, HelpCircle, FileText, LogOut, Eye, Gamepad2, Loader2, Edit2, ChevronRight, Check, ExternalLink, Sun, Moon, Trash2 } from '../components/icons';
import { pushSupport, permission as pushPermission, currentSubscription, enablePush, disablePush, sendTestPush } from '../lib/push';
import { toast } from 'sonner';
import { rankInfo } from '../data/levels';
import { PLANS, SAVE_PCT, money, startCheckout, openBillingPortal } from '../lib/billing';
import { AURA_ORDER, getAura, hexA } from '../data/focusAuras';
import { SOUND_ORDER, getSound } from '../data/focusSounds';

// v2 design system — shared with Progress / Level / Home.
// cyan #95DEE6 = active/selected, lime #DBF67F = progress, purple #A59BCC =
// outline-pill accent, red #B91C1C = destructive (all inlined below).
const LIME = '#DBF67F';
// Focus-time counter (users.total_focus_minutes) -> a readable all-time figure.
// Accrues only in Focus Mode; this is the number the hours titles unlock against.
function formatFocusHours(mins) {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

const SECTION_LABEL = "font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--gm-muted)]";
const CARD = 'rounded-2xl bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-card)]';
const DIALOG = 'bg-[color:var(--gm-card)] text-[color:var(--gm-ink)] border-0';

// Free members can upgrade here any time (the onboarding offer is skippable);
// Pro members manage or cancel through Stripe's customer portal.
function PlanSection({ user }) {
  const [busy, setBusy] = useState(false);
  const isPro = !!user?.is_pro;

  const handle = async () => {
    setBusy(true);
    try {
      if (isPro) {
        await openBillingPortal();
      } else {
        const r = await startCheckout('yearly');
        if (r.alreadyPro) toast.message("You're already on Phase Pro.");
      }
    } catch (e) {
      if (e.code === 'payments_not_configured') toast.message("Payments aren't switched on yet.");
      else if (e.code === 'no_subscription') toast.message('No billing account on file, so there is nothing to manage.');
      else toast.error("Couldn't open billing. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 sm:mb-8" data-testid="plan-section">
      <h2 className={`${SECTION_LABEL} mb-3 sm:mb-4`}>Plan</h2>
      <div className={`${CARD} p-3 sm:p-4 flex items-center gap-3 sm:gap-4`}>
        <div className="flex-1 min-w-0">
          <p className="font-['General_Sans'] font-semibold text-[color:var(--gm-ink)] text-sm sm:text-base">
            {isPro ? 'Phase Pro' : 'Free plan'}
          </p>
          <p className="text-xs sm:text-sm text-[color:var(--gm-muted)]">
            {isPro
              ? 'Update your card or cancel any time.'
              : `Pro is ${money(PLANS.yearly.price)} a year (save ${SAVE_PCT}%), or ${money(PLANS.monthly.price)} a month.`}
          </p>
        </div>
        <button
          onClick={handle}
          disabled={busy}
          className={`h-10 px-4 rounded-full text-sm font-bold flex-shrink-0 transition disabled:opacity-50 ${
            isPro ? 'bg-[var(--gm-badge)] text-[var(--gm-ink)] hover:opacity-90' : 'bg-[#95DEE6] text-[#183A3F] shadow-[var(--gm-shadow-cyan)] hover:opacity-90'
          }`}
          data-testid="plan-action-btn"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isPro ? 'Manage billing' : 'Upgrade'}
        </button>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { switchMode, isGameMode } = useMode();

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [switchModeDialogOpen, setSwitchModeDialogOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (e) {
      toast.error('Failed to log out');
    }
  };

  // Permanent self-service deletion (Google Play + App Store requirement).
  // Server side: public.delete_my_account() removes the auth user and every
  // row they own. Active Pro subscriptions must be cancelled first.
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
      try { await logout(); } catch { /* session is already gone */ }
      toast.success('Your account has been deleted');
      navigate('/', { replace: true });
    } catch (e) {
      toast.error(e?.message || 'Could not delete your account. Please contact support.');
      setDeleting(false);
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
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-lg sm:text-xl font-['Archivo'] font-black bg-[#DBF67F] text-[#2A3B0B]">
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

        {/* Plan */}
        <PlanSection user={user} />

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
              <div>
                <p className="text-xs sm:text-sm text-[color:var(--gm-muted)]">Focus Hours</p>
                <p className="text-lg sm:text-xl font-['Archivo'] font-black text-[color:var(--gm-ink)]">{formatFocusHours(user?.total_focus_minutes)}</p>
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

        {/* Profile customization now lives in ONE place — the Profile panel
            (game mode). It used to be duplicated here, which is what made
            cosmetics feel scattered across Settings and the profile. */}

        {/* Timer Screen - Focus Mode Only (Focus has no profile panel) */}
        {!isGameMode && <TimerScreenSection />}

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

        {/* Delete account */}
        <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteText(''); }}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start mt-2 text-[color:var(--gm-muted)] hover:text-[#B91C1C] hover:bg-[#B91C1C]/10"
              data-testid="delete-account-btn"
            >
              <Trash2 className="w-5 h-5 mr-3" />
              Delete account
            </Button>
          </DialogTrigger>
          <DialogContent className={DIALOG}>
            <DialogHeader>
              <DialogTitle className="font-['Archivo'] font-extrabold">Delete your account?</DialogTitle>
            </DialogHeader>
            <p className="text-[color:var(--gm-muted)] text-sm">
              This permanently deletes your account, habits, streaks, XP, gems and items. It can't be undone.
              {user?.is_pro ? ' Cancel your Pro subscription in Plan → Manage billing first.' : ''}
            </p>
            <Label htmlFor="delete-confirm" className="text-sm mt-3">Type DELETE to confirm</Label>
            <Input
              id="delete-confirm"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              autoComplete="off"
              data-testid="delete-confirm-input"
            />
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="text-[color:var(--gm-muted)] hover:text-[color:var(--gm-ink)]">
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteText !== 'DELETE' || deleting}
                className="bg-[#B91C1C] text-white hover:bg-[#B91C1C]/90"
                data-testid="confirm-delete-account-btn"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete forever'}
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
  const [settings, setSettings] = useState(() => ({
    push_enabled: true, reminders_enabled: true, roast_enabled: true, ...(user?.notification_settings || {}),
  }));
  const [device, setDevice] = useState('checking'); // on | off | blocked | needs-install | unsupported | checking
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  const refreshDevice = useCallback(async () => {
    const support = pushSupport();
    if (support !== 'supported') { setDevice(support); return; }
    if (pushPermission() === 'denied') { setDevice('blocked'); return; }
    const sub = await currentSubscription().catch(() => null);
    setDevice(sub && pushPermission() === 'granted' ? 'on' : 'off');
  }, []);
  useEffect(() => { refreshDevice(); }, [refreshDevice]);

  const save = async (next) => {
    const prev = settings;
    setSettings(next);
    const { error } = await supabase.from('users').update({ notification_settings: next }).eq('id', user.id);
    if (error) { setSettings(prev); toast.error(error.message || 'Failed to update settings'); return false; }
    return true;
  };

  const toggleDevice = async () => {
    setBusy(true);
    try {
      if (device === 'on') {
        await disablePush();
        toast.success('Notifications off on this device');
      } else {
        await enablePush();
        if (!settings.push_enabled) await save({ ...settings, push_enabled: true });
        toast.success('Notifications on. Send a test to check it.');
      }
    } catch (e) {
      toast.error(e?.message || 'Could not change notifications');
    } finally {
      setBusy(false);
      refreshDevice();
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const r = await sendTestPush();
      toast.success(r?.delivered ? 'Sent. It should arrive in a few seconds.' : 'Sent.');
    } catch (e) {
      toast.error(e?.message || 'Could not send a test');
    } finally {
      setTesting(false);
    }
  };

  const deviceCopy = {
    on: 'On for this device',
    off: 'Off on this device',
    blocked: 'Blocked — allow notifications for Phase in your browser or phone settings',
    'needs-install': 'On iPhone: Share → Add to Home Screen, then open Phase from your Home Screen',
    unsupported: 'This browser can’t receive notifications',
    checking: 'Checking…',
  }[device];

  return (
    <div className="rounded-2xl bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-card)]" data-testid="notification-settings">
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Bell className="w-5 h-5 text-[color:var(--gm-ink)] flex-none" />
          <div className="min-w-0">
            <p className="font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">Phone notifications</p>
            <p className="text-sm text-[color:var(--gm-muted)]" data-testid="push-device-status">{deviceCopy}</p>
          </div>
        </div>
        <Switch
          checked={device === 'on'}
          disabled={busy || !['on', 'off'].includes(device)}
          onCheckedChange={toggleDevice}
          className="data-[state=checked]:bg-[#95DEE6] flex-none"
          data-testid="push-toggle"
        />
      </div>

      {device === 'on' && (
        <>
          <Separator className="bg-[color:var(--gm-track)]" />
          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">Streak reminders</p>
              <p className="text-sm text-[color:var(--gm-muted)]">Around when you usually check in, and before your streak ends. Max 2 a day, 8am–10pm.</p>
            </div>
            <Switch
              checked={settings.reminders_enabled !== false}
              onCheckedChange={() => save({ ...settings, reminders_enabled: !(settings.reminders_enabled !== false) })}
              className="data-[state=checked]:bg-[#95DEE6] flex-none"
              data-testid="reminders-toggle"
            />
          </div>
          <Separator className="bg-[color:var(--gm-track)]" />
          <div className="p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[color:var(--gm-muted)]">Not sure it works? Send one now.</p>
            <button type="button" onClick={test} disabled={testing}
              className="h-9 px-4 rounded-full bg-[#95DEE6] text-[#183A3F] text-sm font-bold flex-none disabled:opacity-50" data-testid="push-test">
              {testing ? 'Sending…' : 'Send test'}
            </button>
          </div>
        </>
      )}

      <Separator className="bg-[color:var(--gm-track)]" />
      <div className="p-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">Roast Mode</p>
          <p className="text-sm text-[color:var(--gm-muted)]">{isGameMode ? 'In-app trash talk when you slack' : 'Quiet in-app nudges when you miss sessions'}</p>
        </div>
        <Switch
          checked={settings.roast_enabled !== false}
          onCheckedChange={() => save({ ...settings, roast_enabled: !(settings.roast_enabled !== false) })}
          className="data-[state=checked]:bg-[#95DEE6] flex-none"
          data-testid="roast-toggle"
        />
      </div>
    </div>
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
      <div className="rounded-2xl bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-lime)] p-4">
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

// Focus Mode: pick which purchased Timer Screen the full-screen session uses.
// Buying happens in the Focus shop; equipping lives here. Cyan Pulse is the
// free default (a 0-gem row), so selecting it claims it first if needed.
function TimerScreenSection() {
  const { user, refreshUser } = useAuth();
  const [items, setItems] = useState(null);
  const [ownedIds, setOwnedIds] = useState(new Set());
  const [busy, setBusy] = useState(null);
  const equippedKey = user?.equipped_focus_aura || 'focus_aura_cyan_pulse';
  const equippedSound = user?.equipped_focus_sound || null;

  const load = useCallback(async () => {
    try {
      const { data: rows } = await supabase.from('shop_items')
        .select('id,key,name,price_gems,category')
        .eq('is_active', true)
        .in('category', ['focus_aura', 'focus_sound']);
      const ids = (rows || []).map((r) => r.id);
      const { data: inv } = ids.length
        ? await supabase.from('user_inventory').select('shop_item_id,quantity').in('shop_item_id', ids)
        : { data: [] };
      setOwnedIds(new Set((inv || []).filter((r) => r.quantity > 0).map((r) => r.shop_item_id)));
      setItems(rows || []);
    } catch { /* section stays hidden */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const equip = async (item) => {
    setBusy(item.key);
    try {
      if (!ownedIds.has(item.id)) {
        if ((item.price_gems ?? 0) > 0) return;
        const { error: claimErr } = await supabase.rpc('purchase_shop_item', { p_shop_item_id: item.id });
        if (claimErr) throw claimErr;
      }
      const { error } = await supabase.rpc('equip_item', { p_shop_item_id: item.id });
      if (error) throw error;
      await Promise.all([refreshUser(), load()]);
      toast.success(`${item.name} equipped`);
    } catch (e) {
      toast.error(e?.message || 'Could not equip');
    } finally { setBusy(null); }
  };

  const equipSound = async (item) => {
    setBusy(item ? item.key : 'sound-off');
    try {
      const { error } = item
        ? await supabase.rpc('equip_item', { p_shop_item_id: item.id })
        : await supabase.rpc('unequip_item', { p_category: 'focus_sound' });
      if (error) throw error;
      await Promise.all([refreshUser(), load()]);
      toast.success(item ? `${item.name} equipped` : 'Session sound off');
    } catch (e) {
      toast.error(e?.message || 'Could not update');
    } finally { setBusy(null); }
  };

  if (!items) return null;

  return (
    <section className="mb-6 sm:mb-8" data-testid="timer-screen-settings">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className={SECTION_LABEL}>Timer Screen</h2>
        <Link to="/dashboard/focus-shop?tab=screens" className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.08em] text-[#95DEE6] hover:underline">Get more in Shop</Link>
      </div>
      <div className={`${CARD} p-4`}>
        <p className="text-sm text-[color:var(--gm-muted)] mb-3">The look of your full-screen focus session.</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {AURA_ORDER.map((key) => {
            const aura = getAura(key);
            const item = items.find((r) => r.key === key);
            if (!item) return null;
            const isEquipped = key === equippedKey;
            const canUse = ownedIds.has(item.id) || (item.price_gems ?? 0) === 0;
            return (
              <button
                key={key}
                type="button"
                onClick={() => canUse && !isEquipped && equip(item)}
                disabled={!canUse || isEquipped || busy === key}
                title={canUse ? aura.name : `${aura.name} (Unlock in Shop)`}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors ${isEquipped ? 'bg-[color:var(--gm-track)]' : ''} ${canUse ? '' : 'opacity-45 cursor-not-allowed'} disabled:cursor-default`}
                data-testid={`timer-screen-${key}`}
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center relative"
                  style={{
                    background: aura.bg,
                    boxShadow: [
                      aura.style === 'glow' ? `0 0 10px 2px ${hexA(aura.accent, 0.45)}` : null,
                      isEquipped ? `0 0 0 2px ${aura.ink}` : `inset 0 0 0 1px ${hexA(aura.ink, 0.18)}`,
                    ].filter(Boolean).join(', '),
                  }}
                >
                  {busy === key ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: aura.ink }} />
                    : isEquipped ? <Check className="w-4 h-4" style={{ color: aura.ink }} strokeWidth={3} />
                    : !canUse ? <Lock className="w-3.5 h-3.5" style={{ color: aura.ink, opacity: 0.7 }} /> : null}
                </span>
                <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-[0.04em] text-[color:var(--gm-muted)] text-center leading-tight">{aura.name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-[color:var(--gm-track)]" data-testid="session-sound-settings">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-sm text-[color:var(--gm-muted)]">Session sound — plays quietly during a focus session.</p>
            <Link to="/dashboard/focus-shop?tab=sounds" className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.08em] text-[#95DEE6] hover:underline flex-shrink-0">Get more</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {[null, ...SOUND_ORDER].map((key) => {
              const sound = key ? getSound(key) : null;
              const item = key ? items.find((r) => r.key === key) : null;
              if (key && !item) return null;
              const isEquipped = (equippedSound || null) === key;
              const canUse = !key || ownedIds.has(item.id);
              return (
                <button
                  key={key || 'off'}
                  type="button"
                  onClick={() => canUse && !isEquipped && equipSound(item)}
                  disabled={!canUse || isEquipped || busy === (item ? item.key : 'sound-off')}
                  title={canUse ? (sound ? sound.name : 'Off') : `${sound.name} (Unlock in Shop)`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-[0.06em] transition-colors ${
                    isEquipped ? 'bg-[#95DEE6] text-[#183A3F]' : canUse ? 'bg-[color:var(--gm-bg)] text-[color:var(--gm-ink)] hover:brightness-125' : 'bg-[color:var(--gm-bg)] text-[color:var(--gm-muted)] opacity-50 cursor-not-allowed'
                  } disabled:cursor-default`}
                  data-testid={`session-sound-${key || 'off'}`}
                >
                  {!canUse && <Lock className="w-3 h-3" />}
                  {isEquipped && <Check className="w-3 h-3" strokeWidth={3} />}
                  {sound ? sound.name : 'Off'}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

