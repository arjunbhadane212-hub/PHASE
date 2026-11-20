// Report / Block actions for a profile you are viewing. Required by the Google
// Play + App Store user-generated-content rules: any screen showing another
// user's profile must let you report it and block them.
//
// - Reporting hits the existing submit_report RPC (dedupes open reports server
//   side, so tapping twice is harmless).
// - Blocking hits block_user; get_public_profile then hides the profile both
//   ways, and the block is managed/undone in Settings → Privacy & Safety.
//
// Hidden entirely when signed out or when the profile is your own — you can't
// report or block yourself.

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { MoreVertical, Flag, Ban, Loader2 } from '../icons';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '../ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';

const REPORT_REASONS = [
  'Spam or scam',
  'Harassment or bullying',
  'Hate speech or symbols',
  'Impersonation',
  'Inappropriate name or content',
  'Other',
];

export default function ProfileActions({ username, onBlocked }) {
  const { user, isAuthenticated } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  // Don't offer report/block on your own profile, or when signed out.
  const isSelf = user && typeof user === 'object' && user.username === username;
  if (!isAuthenticated || isSelf || !username) return null;

  const submitReport = async () => {
    if (!reason) { toast.error('Pick a reason first.'); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('submit_report', {
        p_reported_username: username,
        p_reason: reason,
        p_details: details.trim() || null,
      });
      if (error) throw error;
      if (data?.duplicate) toast.message('You already reported this profile. Our team is on it.');
      else toast.success('Thanks — this profile has been reported.');
      setReportOpen(false);
      setReason(''); setDetails('');
    } catch (e) {
      toast.error(e?.message || "Couldn't send the report. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmBlock = async () => {
    setBlocking(true);
    try {
      const { error } = await supabase.rpc('block_user', { p_username: username });
      if (error) throw error;
      toast.success(`You blocked @${username}.`);
      setBlockOpen(false);
      onBlocked?.();
    } catch (e) {
      toast.error(e?.message || "Couldn't block this user. Try again.");
    } finally {
      setBlocking(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/75 hover:text-white transition-colors"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
            aria-label="More options"
            data-testid="profile-actions-trigger"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[180px] border-0 text-[color:var(--gm-ink)]"
          style={{ background: '#121622', boxShadow: '0 16px 48px -16px rgba(0,0,0,0.9)' }}
        >
          <DropdownMenuItem
            onSelect={() => setReportOpen(true)}
            className="gap-2.5 cursor-pointer focus:bg-white/5 text-[color:var(--gm-ink)]"
            data-testid="profile-report-item"
          >
            <Flag className="w-4 h-4" /> Report profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setBlockOpen(true)}
            className="gap-2.5 cursor-pointer focus:bg-white/5 text-[#F87171]"
            data-testid="profile-block-item"
          >
            <Ban className="w-4 h-4" /> Block @{username}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={(o) => { if (!submitting) setReportOpen(o); }}>
        <DialogContent className="border-0 text-[color:var(--gm-ink)]" style={{ background: '#121622' }} data-testid="report-dialog">
          <DialogHeader>
            <DialogTitle>Report @{username}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[color:var(--gm-muted)] -mt-1">Tell us what's wrong. Reports are private and reviewed by our team.</p>
          <div className="space-y-2 mt-1" data-testid="report-reasons">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  reason === r
                    ? 'bg-[#D4F36B] text-[#2B3A06]'
                    : 'bg-white/5 text-[color:var(--gm-ink)] hover:bg-white/10'
                }`}
                data-testid={`report-reason-${r}`}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={1000}
            placeholder="Add any details (optional)"
            className="mt-2 bg-white/5 border-0 text-[color:var(--gm-ink)] placeholder:text-[color:var(--gm-muted)]"
            data-testid="report-details"
          />
          <DialogFooter className="mt-2 gap-2">
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              disabled={submitting}
              className="h-10 px-4 rounded-full text-sm font-bold bg-white/5 text-[color:var(--gm-ink)] hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitReport}
              disabled={submitting || !reason}
              className="h-10 px-4 rounded-full text-sm font-bold bg-[#D4F36B] text-[#2B3A06] hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              data-testid="report-submit"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit report'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block confirm dialog */}
      <Dialog open={blockOpen} onOpenChange={(o) => { if (!blocking) setBlockOpen(o); }}>
        <DialogContent className="border-0 text-[color:var(--gm-ink)]" style={{ background: '#121622' }} data-testid="block-dialog">
          <DialogHeader>
            <DialogTitle>Block @{username}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[color:var(--gm-muted)]">
            They won't be able to see your profile, and you won't see theirs. You can undo this any time in Settings → Privacy &amp; Safety.
          </p>
          <DialogFooter className="mt-3 gap-2">
            <button
              type="button"
              onClick={() => setBlockOpen(false)}
              disabled={blocking}
              className="h-10 px-4 rounded-full text-sm font-bold bg-white/5 text-[color:var(--gm-ink)] hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmBlock}
              disabled={blocking}
              className="h-10 px-4 rounded-full text-sm font-bold bg-[#B91C1C] text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              data-testid="block-confirm"
            >
              {blocking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Block'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
