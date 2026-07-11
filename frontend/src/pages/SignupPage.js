import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Zap, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validateName = (name) => {
    return name.replace(/\s/g, '').match(/^[a-zA-Z]+$/);
  };

  const validatePassword = (password) => {
    const checks = {
      length: password.length >= 8,
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)
    };
    return checks;
  };

  const passwordChecks = validatePassword(formData.password);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = formData.password === formData.confirmPassword;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validate
    const errors = {};
    if (!validateName(formData.firstName)) {
      errors.firstName = 'First name must contain only letters';
    }
    if (!validateName(formData.lastName)) {
      errors.lastName = 'Last name must contain only letters';
    }
    if (!isPasswordValid) {
      errors.password = 'Password does not meet requirements';
    }
    if (!passwordsMatch) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!agreedToTerms) {
      errors.terms = 'You must agree to the terms';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      await register(
        formData.firstName,
        formData.lastName,
        formData.email,
        formData.password
      );
      toast.success('Account created!');
      navigate('/onboarding');
    } catch (e) {
      setError(e?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080F] flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8" data-testid="signup-logo">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight font-['Satoshi'] text-white">HabitRPG</span>
          </Link>

          <h1 className="text-3xl font-bold font-['Satoshi'] text-white mb-2" data-testid="signup-title">
            Create your account
          </h1>
          <p className="text-zinc-400 mb-8">
            Start your journey to better habits
          </p>

          {error && (
            <div 
              className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              data-testid="signup-error"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="signup-form">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-zinc-300">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  required
                  className={`bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 h-12 ${
                    fieldErrors.firstName ? 'border-red-500' : ''
                  }`}
                  data-testid="signup-firstname-input"
                />
                {fieldErrors.firstName && (
                  <p className="text-xs text-red-400">{fieldErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-zinc-300">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  required
                  className={`bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 h-12 ${
                    fieldErrors.lastName ? 'border-red-500' : ''
                  }`}
                  data-testid="signup-lastname-input"
                />
                {fieldErrors.lastName && (
                  <p className="text-xs text-red-400">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 h-12"
                data-testid="signup-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                  className={`bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 h-12 pr-12 ${
                    fieldErrors.password ? 'border-red-500' : ''
                  }`}
                  data-testid="signup-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.password && (
                <div className="space-y-1 mt-2">
                  <div className="flex items-center gap-2 text-xs">
                    {passwordChecks.length ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                    <span className={passwordChecks.length ? 'text-green-400' : 'text-zinc-500'}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordChecks.number ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                    <span className={passwordChecks.number ? 'text-green-400' : 'text-zinc-500'}>
                      Contains a number
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordChecks.special ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                    <span className={passwordChecks.special ? 'text-green-400' : 'text-zinc-500'}>
                      Contains a special character
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  required
                  className={`bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 h-12 pr-12 ${
                    fieldErrors.confirmPassword ? 'border-red-500' : ''
                  }`}
                  data-testid="signup-confirm-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-400">Passwords do not match</p>
              )}
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={setAgreedToTerms}
                className="mt-0.5 border-zinc-700 data-[state=checked]:bg-purple-600"
                data-testid="signup-terms-checkbox"
              />
              <label htmlFor="terms" className="text-sm text-zinc-400 leading-relaxed">
                I agree to the{' '}
                <a href="/terms" className="text-purple-400 hover:text-purple-300">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</a>
              </label>
            </div>
            {fieldErrors.terms && (
              <p className="text-xs text-red-400">{fieldErrors.terms}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium"
              disabled={loading || !agreedToTerms || !isPasswordValid || !passwordsMatch}
              data-testid="signup-submit-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300" data-testid="signup-login-link">
              Log In
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 bg-zinc-900/30 border-l border-white/5">
        <div className="relative w-full max-w-lg aspect-square">
          <img 
            src="https://images.unsplash.com/photo-1687463221020-b8769b32c622?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxkYXJrJTIwYWJzdHJhY3QlMjBnZW9tZXRyaWMlMjBiYWNrZ3JvdW5kJTIwcHVycGxlfGVufDB8fHx8MTc3NTA3ODQxN3ww&ixlib=rb-4.1.0&q=85"
            alt="Signup visual"
            className="w-full h-full object-cover rounded-3xl opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 to-transparent rounded-3xl" />
          <div className="absolute bottom-8 left-8 right-8">
            <h2 className="text-2xl font-bold font-['Satoshi'] text-white mb-2">
              Level up your life
            </h2>
            <p className="text-zinc-300">
              Transform your daily habits into an adventure. Earn XP, unlock levels, and become your best self.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
