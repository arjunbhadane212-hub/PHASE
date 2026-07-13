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
import { User, Lock, Bell, HelpCircle, FileText, LogOut, Eye, Gamepad2, Loader2, Edit2, ChevronRight, Palette, Check, ExternalLink, Sun, Moon } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, updateUser, refreshUser } = useAuth();
  const { mode, switchMode, isGameMode } = useMode();
  
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
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-['Satoshi'] text-white mb-4 sm:mb-6">
          Settings
        </h1>

        {/* Profile Section */}
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xs sm:text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 sm:mb-4">Profile</h2>
          <div className="glass-card">
            <div className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold ${
                isGameMode ? 'bg-purple-500/10 text-purple-400' : 'bg-zinc-800 text-white'
              }`}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm sm:text-base truncate">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs sm:text-sm text-zinc-500 truncate">{user?.email}</p>
              </div>
              <EditProfileDialog 
                user={user} 
                open={editProfileOpen}
                onOpenChange={setEditProfileOpen}
                onSuccess={refreshUser}
                isGameMode={isGameMode}
              />
            </div>
            <Separator className="bg-zinc-800" />
            <ChangePasswordDialog
              open={changePasswordOpen}
              onOpenChange={setChangePasswordOpen}
              isGameMode={isGameMode}
            />
          </div>
        </section>

        {/* Progress */}
        <ProgressSection isGameMode={isGameMode} />

        {/* All-Time Stats */}
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xs sm:text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 sm:mb-4">All-Time Stats</h2>
          <div className="glass-card p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {isGameMode && (
                <>
                  <div>
                    <p className="text-xs sm:text-sm text-zinc-500">Total XP</p>
                    <p className="text-lg sm:text-xl font-bold text-blue-400">
                      {user?.total_xp_all_time || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-zinc-500">Highest Level</p>
                    <p className="text-lg sm:text-xl font-bold text-white">{user?.highest_level_reached || 1}</p>
                  </div>
                </>
              )}
              <div>
                <p className="text-xs sm:text-sm text-zinc-500">Longest Streak</p>
                <p className="text-lg sm:text-xl font-bold text-white">{user?.longest_streak_ever || 0} days</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-zinc-500">Habits Completed</p>
                <p className="text-lg sm:text-xl font-bold text-white">{user?.total_habits_completed || 0}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs sm:text-sm text-zinc-500">Member Since</p>
                <p className="text-sm sm:text-base text-white">
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
              className="glass-card p-4 flex items-center justify-between hover-lift transition-all block"
              data-testid="view-profile-link"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className={`w-5 h-5 ${isGameMode ? 'text-blue-400' : 'text-zinc-400'}`} />
                <div>
                  <p className="text-sm font-medium text-white">View Public Profile</p>
                  <p className="text-xs text-zinc-500">@{user.username}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </Link>
          </section>
        )}

        {/* Profile Colors - Game Mode Only */}
        {isGameMode && <ColorSettingsSection isGameMode={isGameMode} />}

        {/* Profile Customization - Game Mode Only */}
        {isGameMode && <ProfileCustomizationSection />}

        {/* App Experience */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">App Experience</h2>
          <div className="glass-card">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isGameMode ? (
                  <Gamepad2 className="w-5 h-5 text-purple-400" />
                ) : (
                  <Eye className="w-5 h-5 text-zinc-400" />
                )}
                <div>
                  <p className="font-medium text-white">
                    {isGameMode ? 'Game Mode' : 'Focus Mode'}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {isGameMode ? 'Full gamified experience' : 'Clean, minimal interface'}
                  </p>
                </div>
              </div>
              <Dialog open={switchModeDialogOpen} onOpenChange={setSwitchModeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800" data-testid="switch-mode-btn">
                    Switch
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                  <DialogHeader>
                    <DialogTitle className="font-['Satoshi']">Switch Mode?</DialogTitle>
                  </DialogHeader>
                  <p className="text-zinc-400">
                    Are you sure you want to switch to {isGameMode ? 'Focus' : 'Game'} Mode? 
                    Your entire UI and features will change.
                  </p>
                  <DialogFooter className="mt-4">
                    <Button variant="ghost" onClick={() => setSwitchModeDialogOpen(false)} className="text-zinc-400">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSwitchMode}
                      disabled={loading}
                      className={isGameMode ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-purple-600 hover:bg-purple-700'}
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

        {/* Notifications */}
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xs sm:text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 sm:mb-4">Appearance</h2>
          <LightModeToggle />
        </section>

        {/* Notifications */}
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xs sm:text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 sm:mb-4">Notifications</h2>
          <NotificationSettings user={user} isGameMode={isGameMode} />
        </section>

        {/* Help & Support */}
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xs sm:text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 sm:mb-4">Help & Support</h2>
          <div className="glass-card">
            <SettingsLink icon={<HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />} label="Help Center" href="/help" />
            <Separator className="bg-white/[0.06]" />
            <SettingsLink icon={<FileText className="w-4 h-4 sm:w-5 sm:h-5" />} label="FAQ" href="/faq" />
          </div>
        </section>

        {/* Legal */}
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xs sm:text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 sm:mb-4">Legal</h2>
          <div className="glass-card">
            <SettingsLink icon={<FileText className="w-4 h-4 sm:w-5 sm:h-5" />} label="Terms & Rights" href="/terms" />
            <Separator className="bg-white/[0.06]" />
            <SettingsLink icon={<Lock className="w-4 h-4 sm:w-5 sm:h-5" />} label="Privacy Policy" href="/privacy" />
          </div>
        </section>

        {/* Log out */}
        <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Log Out
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle className="font-['Satoshi']">Log Out?</DialogTitle>
            </DialogHeader>
            <p className="text-zinc-400">
              Are you sure you want to log out?
            </p>
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setLogoutDialogOpen(false)} className="text-zinc-400">
                Cancel
              </Button>
              <Button 
                onClick={handleLogout}
                className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
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
      className="flex items-center justify-between p-3 sm:p-4 hover:bg-zinc-800/50 transition-colors"
    >
      <div className="flex items-center gap-2 sm:gap-3 text-zinc-300">
        {icon}
        <span className="text-sm sm:text-base">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600" />
    </a>
  );
}

function EditProfileDialog({ user, open, onOpenChange, onSuccess, isGameMode }) {
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
        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" data-testid="edit-profile-btn">
          <Edit2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="font-['Satoshi']">Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">First Name</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              data-testid="edit-firstname-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">Last Name</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              data-testid="edit-lastname-input"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={isGameMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-zinc-700 hover:bg-zinc-600'}
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

function ChangePasswordDialog({ open, onOpenChange, isGameMode }) {
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
        <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors text-left" data-testid="change-password-btn">
          <div className="flex items-center gap-3 text-zinc-300">
            <Lock className="w-5 h-5" />
            <span>Change Password</span>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="font-['Satoshi']">Change Password</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              data-testid="current-password-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              data-testid="new-password-input"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !currentPassword || !newPassword}
              className={isGameMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-zinc-700 hover:bg-zinc-600'}
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
    <div className={`rounded-xl ${isGameMode ? 'bg-zinc-900/50 border border-white/10' : 'bg-zinc-900 border border-zinc-800'}`}>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-zinc-400" />
          <div>
            <p className="font-medium text-white">Push Notifications</p>
            <p className="text-sm text-zinc-500">Receive notifications on your device</p>
          </div>
        </div>
        <Switch
          checked={settings.push_enabled}
          onCheckedChange={() => handleToggle('push_enabled')}
          className="data-[state=checked]:bg-purple-600"
          data-testid="push-toggle"
        />
      </div>
      
      {settings.push_enabled && (
        <>
          <Separator className="bg-zinc-800" />
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Reminders</p>
              <p className="text-sm text-zinc-500">Habit reminders throughout the day</p>
            </div>
            <Switch
              checked={settings.reminders_enabled}
              onCheckedChange={() => handleToggle('reminders_enabled')}
              className="data-[state=checked]:bg-purple-600"
              data-testid="reminders-toggle"
            />
          </div>
          
          {/* Roast Mode - both modes */}
          <Separator className="bg-zinc-800" />
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Roast Mode</p>
              <p className="text-sm text-zinc-500">{isGameMode ? 'Competitive trash talk when you slack' : 'Quiet nudges when you miss sessions'}</p>
            </div>
            <Switch
              checked={settings.roast_enabled}
              onCheckedChange={() => handleToggle('roast_enabled')}
              className="data-[state=checked]:bg-purple-600"
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
  const [titles, setTitles] = useState(null);
  const [profileItems, setProfileItems] = useState(null);
  const [equipping, setEquipping] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [t, p] = await Promise.all([
          axios.get(`${API}/profile/me/titles`),
          axios.get(`${API}/shop/profile-items`),
        ]);
        setTitles(t.data);
        setProfileItems(p.data);
      } catch { /* ignore */ }
    };
    fetchData();
  }, []);

  const handleEquip = async (type, key) => {
    setEquipping(`${type}-${key}`);
    try {
      // Equip mechanism wired to Supabase; ownership validation skipped until
      // Step 5's shop populates unlocked_*.
      const column = `equipped_${type}`;
      const { error } = await supabase.from('users').update({ [column]: key || null }).eq('id', user.id);
      if (error) throw error;
      await refreshUser();
      if (type === 'title') {
        // TODO(Step 5): titles catalog comes from the shop/inventory system
        const { data } = await axios.get(`${API}/profile/me/titles`);
        setTitles(data);
      }
      toast.success(`${type} ${key ? 'equipped' : 'removed'}!`);
    } catch (e) {
      toast.error(e?.message || 'Failed to equip');
    } finally { setEquipping(null); }
  };

  if (!titles) return null;

  const earnedTitles = titles.earned_titles || [];
  const equippedTitle = titles.equipped_title;
  const ownedIcons = (profileItems?.icons || []).filter(i => i.owned);
  const ownedAnims = (profileItems?.animations || []).filter(a => a.owned);
  const ownedBanners = (profileItems?.banners || []).filter(b => b.owned);

  return (
    <section className="mb-6" data-testid="profile-customization">
      <h2 className="text-xs sm:text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Profile Customization</h2>
      
      {/* Titles */}
      {earnedTitles.length > 0 && (
        <div className="glass-card p-4 mb-3">
          <p className="text-sm text-zinc-400 mb-2">Titles</p>
          <div className="flex flex-wrap gap-2">
            {equippedTitle && (
              <button onClick={() => handleEquip('title', null)} className="text-xs px-3 py-1 rounded-full border border-red-500/20 text-red-400 hover:bg-red-500/10">Remove</button>
            )}
            {earnedTitles.map(t => (
              <button key={t.title} onClick={() => handleEquip('title', t.title)} disabled={equipping === `title-${t.title}`}
                className={`text-xs font-bold px-3 py-1 rounded-full border transition-all title-${t.rarity} ${equippedTitle === t.title ? 'border-white/30 bg-white/5' : 'border-white/[0.06] hover:bg-white/5'}`}
                data-testid={`equip-title-${t.title}`}>
                {t.title} {equippedTitle === t.title && <Check className="w-3 h-3 inline ml-1" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Icons */}
      {ownedIcons.length > 0 && (
        <div className="glass-card p-4 mb-3">
          <p className="text-sm text-zinc-400 mb-2">Icons</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleEquip('icon', null)} className="text-xs px-3 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:bg-zinc-800">Default</button>
            {ownedIcons.map(i => (
              <button key={i.key} onClick={() => handleEquip('icon', i.key)} disabled={equipping === `icon-${i.key}`}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${user?.equipped_icon === i.key ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-white/[0.06] text-zinc-300 hover:bg-white/5'}`}>
                {i.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Animations */}
      {ownedAnims.length > 0 && (
        <div className="glass-card p-4 mb-3">
          <p className="text-sm text-zinc-400 mb-2">Animations</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleEquip('animation', null)} className="text-xs px-3 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:bg-zinc-800">None</button>
            {ownedAnims.map(a => (
              <button key={a.key} onClick={() => handleEquip('animation', a.key)} disabled={equipping === `animation-${a.key}`}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${user?.equipped_animation === a.key ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-white/[0.06] text-zinc-300 hover:bg-white/5'}`}>
                {a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Banners */}
      {ownedBanners.length > 0 && (
        <div className="glass-card p-4 mb-3">
          <p className="text-sm text-zinc-400 mb-2">Banners</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleEquip('banner', null)} className="text-xs px-3 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:bg-zinc-800">Default</button>
            {ownedBanners.map(b => (
              <button key={b.key} onClick={() => handleEquip('banner', b.key)} disabled={equipping === `banner-${b.key}`}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${user?.equipped_banner === b.key ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-white/[0.06] text-zinc-300 hover:bg-white/5'}`}>
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {earnedTitles.length === 0 && ownedIcons.length === 0 && ownedAnims.length === 0 && ownedBanners.length === 0 && (
        <div className="glass-card p-4 text-center text-sm text-zinc-500">
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
    <div className="glass-card p-4 flex items-center justify-between" data-testid="light-mode-toggle">
      <div className="flex items-center gap-3">
        {lightMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-zinc-400" />}
        <div>
          <p className="font-medium text-white">Light Mode</p>
          <p className="text-sm text-zinc-500">{lightMode ? 'Light theme active' : 'Dark theme active'}</p>
        </div>
      </div>
      <Switch
        checked={lightMode}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-amber-500"
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
      <h2 className="text-xs sm:text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 sm:mb-4">Progress</h2>
      <div className="glass-card p-4">
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">Today</span>
            <span className="text-white font-medium">{daily.completed_habits}/{daily.total_habits}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isGameMode ? 'bg-blue-500' : 'bg-zinc-400'}`}
              style={{ width: `${todayPct}%` }}
              data-testid="progress-today-bar"
            />
          </div>
        </div>

        {weekly && (
          <div className={`grid ${isGameMode ? 'grid-cols-3' : 'grid-cols-2'} gap-3 pt-3 border-t border-white/5`}>
            <div>
              <p className="text-xs text-zinc-500">Completion Rate</p>
              <p className="text-lg font-bold text-white">{weekly.completion_rate}%</p>
            </div>
            {isGameMode && (
              <div>
                <p className="text-xs text-zinc-500">XP This Week</p>
                <p className="text-lg font-bold text-white">{weekly.total_xp}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-500">Full Days</p>
              <p className="text-lg font-bold text-white">{weekly.full_days}/7</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}


function ColorSettingsSection({ isGameMode }) {
  const { user, refreshUser } = useAuth();
  const [colors, setColors] = useState(null);
  const [updating, setUpdating] = useState(null);

  const fetchColors = useCallback(async () => {
    try {
      // TODO(Step 5): color catalog + owned flags come from the shop/inventory
      // system, which isn't built yet. Until then this returns nothing and the
      // section stays hidden.
      const { data } = await axios.get(`${API}/game/colors`);
      // Backend may be unconfigured (relative URL resolves to the SPA's HTML);
      // only accept a well-formed payload, otherwise colors.*.map() crashes the
      // whole Settings page. Malformed → stays null → section hides gracefully.
      if (data && Array.isArray(data.banner_colors) && Array.isArray(data.main_colors)) {
        setColors(data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchColors(); }, [fetchColors]);

  const handleSelect = async (hex, type) => {
    setUpdating(`${type}-${hex}`);
    try {
      // Equip mechanism wired to Supabase. Ownership validation intentionally
      // skipped for now (unlocked_* is populated by Step 5's shop).
      const column = type === 'banner' ? 'selected_banner_color' : 'selected_main_color';
      const { error } = await supabase.from('users').update({ [column]: hex }).eq('id', user.id);
      if (error) throw error;
      await Promise.all([fetchColors(), refreshUser()]);
      toast.success('Color updated!');
    } catch (e) {
      toast.error(e?.message || 'Failed to update');
    } finally { setUpdating(null); }
  };

  if (!colors) return null;

  return (
    <section className="mb-6" data-testid="color-settings">
      <h2 className="text-xs sm:text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Profile Colors</h2>
      
      {/* Banner Color */}
      <div className="mb-4">
        <p className="text-sm text-zinc-400 mb-2 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> Banner Color</p>
        <div className="flex flex-wrap gap-2">
          <ColorSwatch hex="#1F2937" name="Default" selected={colors.selected_banner === '#1F2937'} owned={true} onSelect={() => handleSelect('#1F2937', 'banner')} updating={updating === 'banner-#1F2937'} />
          {colors.banner_colors.map(c => (
            <ColorSwatch key={c.hex} hex={c.hex} name={c.name} selected={c.selected} owned={c.owned} onSelect={() => c.owned && handleSelect(c.hex, 'banner')} updating={updating === `banner-${c.hex}`} />
          ))}
        </div>
      </div>

      {/* Main Color */}
      <div>
        <p className="text-sm text-zinc-400 mb-2 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> Main Color</p>
        <div className="flex flex-wrap gap-2">
          <ColorSwatch hex="#1F2937" name="Default" selected={colors.selected_main === '#1F2937'} owned={true} onSelect={() => handleSelect('#1F2937', 'main')} updating={updating === 'main-#1F2937'} />
          {colors.main_colors.map(c => (
            <ColorSwatch key={c.hex} hex={c.hex} name={c.name} selected={c.selected} owned={c.owned} onSelect={() => c.owned && handleSelect(c.hex, 'main')} updating={updating === `main-${c.hex}`} />
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
        selected ? 'border-white scale-110' : owned ? 'border-white/20 hover:scale-105' : 'border-white/10 opacity-40 cursor-not-allowed'
      }`}
      style={{ backgroundColor: hex }}
      data-testid={`color-swatch-${hex}`}
    >
      {selected && <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />}
      {!owned && <Lock className="w-3 h-3 text-white/60 absolute inset-0 m-auto" />}
    </button>
  );
}
