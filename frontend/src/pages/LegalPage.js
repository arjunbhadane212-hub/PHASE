import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from '../components/icons';
import { APP_NAME, SUPPORT_EMAIL, OPERATOR_NAME, OPERATOR_COUNTRY, LEGAL_LAST_UPDATED } from '../config/legal';

const H2 = "text-lg font-['Archivo'] font-extrabold text-[color:var(--gm-ink)] mt-8 mb-2";
const P = 'text-sm leading-relaxed text-[color:var(--gm-muted)] mb-3';
const LI = 'text-sm leading-relaxed text-[color:var(--gm-muted)] mb-1.5';

function Contact() {
  if (!SUPPORT_EMAIL) {
    return <span className="text-[#B91C1C]">[support email not set — add it in src/config/legal.js]</span>;
  }
  return <a className="underline underline-offset-2 text-[color:var(--gm-ink)]" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
}

function Shell({ title, children, testId }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[color:var(--gm-bg)] p-5 sm:p-8" data-testid={testId}>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="flex items-center gap-2 text-sm text-[color:var(--gm-muted)] hover:text-[color:var(--gm-ink)] mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl sm:text-3xl font-['Archivo'] font-black text-[color:var(--gm-ink)] tracking-[-0.01em]">{title}</h1>
        <p className="font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--gm-muted)] mt-2 mb-6">
          Last updated {LEGAL_LAST_UPDATED}
        </p>
        {children}
        <p className={`${P} mt-10`}>Questions? Contact us at <Contact />.</p>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <Shell title="Privacy Policy" testId="privacy-page">
      <p className={P}>
        This policy explains what {APP_NAME} collects, why, who it is shared with, and how to delete it.
        {OPERATOR_NAME ? ` ${APP_NAME} is operated by ${OPERATOR_NAME} (${OPERATOR_COUNTRY}).` : ''}
      </p>

      <h2 className={H2}>What we collect</h2>
      <ul className="list-disc pl-5 mb-3">
        <li className={LI}><b>Account details:</b> your name, email address, username, and password (stored encrypted by our authentication provider). If you sign in with Google, we receive your name and email from Google.</li>
        <li className={LI}><b>What you do in the app:</b> your habits, completions, streaks, XP, gems, items you unlock or equip, Focus Mode sessions, notifications, and leaderboard standing.</li>
        <li className={LI}><b>Onboarding answers:</b> the answers you give to the questions when you first sign up.</li>
        <li className={LI}><b>Subscription status:</b> if you buy Phase Pro, our payment provider tells us whether your subscription is active. We never see or store your card details.</li>
        <li className={LI}><b>Technical data:</b> basic information your device sends when it loads the app, such as browser type and error reports.</li>
      </ul>

      <h2 className={H2}>Why we use it</h2>
      <p className={P}>To run your account and the game (tracking habits, awarding XP and rewards, streaks, leaderboards), to keep the service secure, to process Pro subscriptions, and to understand how to improve {APP_NAME}. We do not sell your personal data and we do not show ads.</p>

      <h2 className={H2}>What other people can see</h2>
      <p className={P}>Your public profile (name, username, rank, streak, titles and other equipped items) is visible to others by design. It is visible to anyone who has its link. Your habits, onboarding answers and email are never shown publicly.</p>

      <h2 className={H2}>Services we use</h2>
      <ul className="list-disc pl-5 mb-3">
        <li className={LI}><b>Supabase</b> — database and sign-in.</li>
        <li className={LI}><b>Vercel</b> — hosting the app.</li>
        <li className={LI}><b>Google</b> — only if you choose "Sign in with Google".</li>
        <li className={LI}><b>Stripe</b> — only if you buy Phase Pro.</li>
      </ul>

      <h2 className={H2}>How long we keep it</h2>
      <p className={P}>We keep your data while your account exists. When you delete your account, your profile and app data are deleted.</p>

      <h2 className={H2}>Deleting your account</h2>
      <p className={P}>Go to <b>Settings → Delete account</b>. This permanently removes your account and data. If you cannot sign in, email <Contact /> from the address on your account and we will delete it for you. If you have an active Pro subscription, cancel it first in Settings → Plan → Manage billing.</p>

      <h2 className={H2}>Your rights</h2>
      <p className={P}>You can ask to access, correct, export or delete your personal data at any time by contacting <Contact />.</p>

      <h2 className={H2}>Children</h2>
      <p className={P}>{APP_NAME} is not intended for children under 13, and we do not knowingly collect data from them.</p>

      <h2 className={H2}>Changes</h2>
      <p className={P}>If we change this policy we will update the date above, and tell you in the app for significant changes.</p>
    </Shell>
  );
}

export function TermsPage() {
  return (
    <Shell title="Terms of Service" testId="terms-page">
      <p className={P}>By creating an account or using {APP_NAME}, you agree to these terms.</p>

      <h2 className={H2}>Your account</h2>
      <p className={P}>You must be at least 13 years old. Keep your login details safe; you are responsible for activity on your account. One person per account.</p>

      <h2 className={H2}>Fair play</h2>
      <p className={P}>Don't cheat the game, exploit bugs, use bots or scripts, impersonate others, or pick offensive usernames or profile content. We may reset progress, remove items, or suspend accounts that break these rules.</p>

      <h2 className={H2}>Gems, XP and items</h2>
      <p className={P}>Gems, XP, titles and other in-app items are earned by using the app. They have no cash value, can't be bought with real money, transferred or exchanged, and may be rebalanced as the game evolves.</p>

      <h2 className={H2}>Phase Pro</h2>
      <p className={P}>Pro is an optional subscription that renews automatically until you cancel. Prices are shown before you pay. You can cancel any time in Settings → Plan → Manage billing; you keep Pro until the end of the period you paid for. Refunds follow the rules of the store or payment provider you paid through.</p>

      <h2 className={H2}>No medical advice</h2>
      <p className={P}>{APP_NAME} is a motivation tool. It is not medical, psychological or professional advice.</p>

      <h2 className={H2}>The service</h2>
      <p className={P}>We work hard to keep {APP_NAME} running, but it is provided "as is" and may change, have downtime, or lose data. To the extent the law allows, we are not liable for indirect losses from using it.</p>

      <h2 className={H2}>Ending your account</h2>
      <p className={P}>You can delete your account any time in Settings. We may suspend or close accounts that break these terms.</p>

      <h2 className={H2}>Changes</h2>
      <p className={P}>We may update these terms; the date above shows the latest version. Continuing to use {APP_NAME} after a change means you accept it.</p>
    </Shell>
  );
}

const FAQ = [
  ['How do I earn XP and gems?', 'Complete your habits in Game Mode. Harder habits give more: Medium habits earn +25 XP and +10 gems.'],
  ['What is the difference between Game Mode and Focus Mode?', 'Game Mode is the full game: XP, ranks, gems, the shop, loot boxes and leaderboards. Focus Mode is calm and distraction-free: you start a timed session for each habit, with no XP or leaderboards. You can switch any time in Settings.'],
  ['What happens if I miss a day?', 'Your streak resets unless you have a Streak Shield, which protects it for one missed day.'],
  ['Can I buy gems?', 'No. Gems are only earned by completing habits.'],
  ['Is my profile public?', 'Yes. Your public profile shows your name, username, rank, streak and titles to anyone with the link. Your habits, onboarding answers and email are never shown.'],
  ['How do I delete my account?', 'Settings → Delete account. It is permanent.'],
];

export function HelpPage() {
  return (
    <Shell title="Help & FAQ" testId="help-page">
      {FAQ.map(([q, a]) => (
        <div key={q} className="mb-5">
          <h2 className="text-base font-bold text-[color:var(--gm-ink)] mb-1">{q}</h2>
          <p className={P}>{a}</p>
        </div>
      ))}
      <p className={P}>Still stuck? <Link to="/privacy" className="underline underline-offset-2">Privacy Policy</Link> · <Link to="/terms" className="underline underline-offset-2">Terms</Link></p>
    </Shell>
  );
}
