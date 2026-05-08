import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Zap, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { formatApiErrorDetail } from '../contexts/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSent(true);
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold font-['Satoshi'] text-white mb-3" data-testid="forgot-success-title">
            Check your email
          </h1>
          <p className="text-zinc-400 mb-8">
            If an account exists with <span className="text-white">{email}</span>, you'll receive a password reset link shortly.
          </p>
          <Link to="/login">
            <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
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
        <Link to="/" className="flex items-center gap-2 mb-8" data-testid="forgot-logo">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight font-['Satoshi'] text-white">HabitRPG</span>
        </Link>

        <h1 className="text-3xl font-bold font-['Satoshi'] text-white mb-2" data-testid="forgot-title">
          Forgot your password?
        </h1>
        <p className="text-zinc-400 mb-8">
          No worries. Enter your email and we'll send you a reset link.
        </p>

        {error && (
          <div 
            className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            data-testid="forgot-error"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" data-testid="forgot-form">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 h-12"
              data-testid="forgot-email-input"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium"
            disabled={loading}
            data-testid="forgot-submit-btn"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </form>

        <p className="mt-8 text-center">
          <Link to="/login" className="text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
