import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import AuthShell, { AuthTitle, AuthField, AuthError, PrimaryButton, SignupPanel, eyebrow } from '../components/auth/AuthShell';

// Two short steps instead of one long form: account first (email + password),
// then your name. The confirm-password field is gone — the reveal toggle does
// that job without doubling the typing.

const validateName = (name) => name.replace(/\s/g, '').match(/^[a-zA-Z]+$/);

const passwordChecksFor = (password) => [
  { key: 'length', label: '8+ characters', ok: password.length >= 8 },
  { key: 'number', label: 'A number', ok: /\d/.test(password) },
  { key: 'special', label: 'A symbol', ok: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password) },
];

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const passwordChecks = passwordChecksFor(formData.password);
  const isPasswordValid = passwordChecks.every((c) => c.ok);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleContinue = (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setFieldErrors({ password: 'Password does not meet requirements' });
      return;
    }
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = {};
    if (!validateName(formData.firstName)) errors.firstName = 'Letters only';
    if (!validateName(formData.lastName)) errors.lastName = 'Letters only';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await register(formData.firstName, formData.lastName, formData.email, formData.password);
      toast.success('Account created!');
      navigate('/onboarding');
    } catch (e) {
      setError(e?.message || 'Registration failed. Please try again.');
      // Most failures (email taken, weak password) belong to step one.
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell panel={<SignupPanel />}>
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex gap-1.5">
          {[0, 1].map((i) => (
            <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? 'bg-[#95DEE6]' : 'bg-[var(--gm-track)]'}`} />
          ))}
        </div>
        <span className={`${eyebrow} text-[var(--gm-muted)]`}>Step {step + 1} of 2</span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {step === 0 ? (
          <motion.div
            key="account"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22 }}
          >
            <AuthTitle title="Create your account" sub="Takes a minute. Free forever." testId="signup-title" />
            <AuthError testId="signup-error">{error}</AuthError>

            <form onSubmit={handleContinue} className="space-y-5" data-testid="signup-form">
              <AuthField
                id="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={(v) => handleChange('email', v)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                testId="signup-email-input"
              />
              <AuthField
                id="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={(v) => handleChange('password', v)}
                placeholder="Create a password"
                autoComplete="new-password"
                error={fieldErrors.password}
                testId="signup-password-input"
              >
                <div className="flex flex-wrap gap-1.5 pt-1" data-testid="signup-password-checks">
                  {passwordChecks.map((c) => (
                    <span
                      key={c.key}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                        c.ok ? 'bg-[#DBF67F] text-[#2A3B0B]' : 'bg-[var(--gm-card)] text-[var(--gm-muted)]'
                      }`}
                    >
                      {c.ok && <Check className="w-3 h-3" strokeWidth={3} />}
                      {c.label}
                    </span>
                  ))}
                </div>
              </AuthField>

              <PrimaryButton
                type="submit"
                disabled={!formData.email || !isPasswordValid}
                className="!mt-8"
                data-testid="signup-continue-btn"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </PrimaryButton>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.22 }}
          >
            <AuthTitle title="What should we call you?" sub="This is the name on your profile." testId="signup-title" />
            <AuthError testId="signup-error">{error}</AuthError>

            <form onSubmit={handleSubmit} className="space-y-5" data-testid="signup-form">
              <div className="grid grid-cols-2 gap-3">
                <AuthField
                  id="firstName"
                  label="First name"
                  value={formData.firstName}
                  onChange={(v) => handleChange('firstName', v)}
                  placeholder="Alex"
                  autoComplete="given-name"
                  autoFocus
                  error={fieldErrors.firstName}
                  testId="signup-firstname-input"
                />
                <AuthField
                  id="lastName"
                  label="Last name"
                  value={formData.lastName}
                  onChange={(v) => handleChange('lastName', v)}
                  placeholder="Rivera"
                  autoComplete="family-name"
                  error={fieldErrors.lastName}
                  testId="signup-lastname-input"
                />
              </div>

              <PrimaryButton type="submit" disabled={loading} className="!mt-8" data-testid="signup-submit-btn">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create account <ArrowRight className="w-4 h-4" /></>}
              </PrimaryButton>

              <p className="text-xs text-center font-medium text-[var(--gm-muted)] leading-relaxed" data-testid="signup-terms">
                By creating an account you agree to the{' '}
                <a href="/terms" className="underline underline-offset-2 hover:text-[var(--gm-ink)]">Terms</a> and{' '}
                <a href="/privacy" className="underline underline-offset-2 hover:text-[var(--gm-ink)]">Privacy Policy</a>.
              </p>

              <button
                type="button"
                onClick={() => setStep(0)}
                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-[var(--gm-muted)] hover:text-[var(--gm-ink)]"
                data-testid="signup-back-btn"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-8 text-center text-sm font-medium text-[var(--gm-muted)]">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-[var(--gm-ink)] underline underline-offset-4 decoration-[#95DEE6] decoration-2" data-testid="signup-login-link">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
