import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, formatApiErrorDetail } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      toast.success('Welcome back!');
      
      if (!user.onboarding_completed) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(formatApiErrorDetail(detail) || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080F] flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8" data-testid="login-logo">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight font-['Satoshi'] text-white">HabitRPG</span>
          </Link>

          <h1 className="text-3xl font-bold font-['Satoshi'] text-white mb-2" data-testid="login-title">
            Welcome back
          </h1>
          <p className="text-zinc-400 mb-8">
            Log in to continue your journey
          </p>

          {error && (
            <div 
              className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              data-testid="login-error"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
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
                data-testid="login-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 h-12 pr-12"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  data-testid="login-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link 
                to="/forgot-password" 
                className="text-sm text-purple-400 hover:text-purple-300"
                data-testid="login-forgot-link"
              >
                Forgot Password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Log In'
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-zinc-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-purple-400 hover:text-purple-300" data-testid="login-signup-link">
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 bg-zinc-900/30 border-l border-white/5">
        <div className="relative w-full max-w-lg aspect-square">
          <img 
            src="https://images.unsplash.com/photo-1687639160028-95d24c15d04d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwyfHxkYXJrJTIwYWJzdHJhY3QlMjBnZW9tZXRyaWMlMjBiYWNrZ3JvdW5kJTIwcHVycGxlfGVufDB8fHx8MTc3NTA3ODQxN3ww&ixlib=rb-4.1.0&q=85"
            alt="Login visual"
            className="w-full h-full object-cover rounded-3xl opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 to-transparent rounded-3xl" />
          <div className="absolute bottom-8 left-8 right-8">
            <h2 className="text-2xl font-bold font-['Satoshi'] text-white mb-2">
              Your habits, your adventure
            </h2>
            <p className="text-zinc-300">
              Pick up where you left off and continue building the best version of yourself.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
