import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Zap, Loader2, Eye, EyeOff, CheckCircle, Check, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { formatApiErrorDetail } from '../contexts/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = (password) => {
    const checks = {
      length: password.length >= 8,
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)
    };
    return checks;
  };

  const passwordChecks = validatePassword(password);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password does not meet requirements');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: password
      });
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold font-['Satoshi'] text-white mb-3">
            Invalid Reset Link
          </h1>
          <p className="text-zinc-400 mb-8">
            This password reset link is invalid or has expired.
          </p>
          <Link to="/forgot-password">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Request New Link
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold font-['Satoshi'] text-white mb-3" data-testid="reset-success-title">
            Password Reset!
          </h1>
          <p className="text-zinc-400 mb-8">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <Link to="/login">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-8" data-testid="reset-logo">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight font-['Satoshi'] text-white">HabitRPG</span>
        </Link>

        <h1 className="text-3xl font-bold font-['Satoshi'] text-white mb-2" data-testid="reset-title">
          Reset your password
        </h1>
        <p className="text-zinc-400 mb-8">
          Enter your new password below.
        </p>

        {error && (
          <div 
            className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            data-testid="reset-error"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" data-testid="reset-form">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 h-12 pr-12"
                data-testid="reset-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {password && (
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
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 h-12"
              data-testid="reset-confirm-password-input"
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium"
            disabled={loading || !isPasswordValid || !passwordsMatch}
            data-testid="reset-submit-btn"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
