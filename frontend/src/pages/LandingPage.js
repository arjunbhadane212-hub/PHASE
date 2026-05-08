import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Menu, X, ChevronRight, Zap, Target, TrendingUp, Shield, Trophy, Flame, BarChart3, Bell, Gamepad2, Eye, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const features = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "XP & Levels",
      description: "Earn experience points for every habit completed. Level up from Rookie to Apex."
    },
    {
      icon: <Flame className="w-6 h-6" />,
      title: "Streak System",
      description: "Build momentum with daily streaks. Unlock bonus XP at 3, 7, and 30 days."
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Progress Analytics",
      description: "Track your journey with beautiful charts. See daily, weekly, and all-time stats."
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: "Smart Reminders",
      description: "Get nudges when you need them. Game Mode includes playful roast notifications."
    },
    {
      icon: <Gamepad2 className="w-6 h-6" />,
      title: "Game Mode",
      description: "Full RPG experience with animations, particles, and level-up celebrations."
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: "Focus Mode",
      description: "Minimal, distraction-free interface. Pure progress without the noise."
    }
  ];

  const faqs = [
    {
      question: "How does the XP and leveling system work?",
      answer: "You earn XP by completing daily habits. Easy habits give 10 XP, medium 25 XP, and hard habits 50 XP. Bonus XP is awarded for completing all habits in a time slot, finishing your entire day, and maintaining streaks."
    },
    {
      question: "What's the difference between Focus Mode and Game Mode?",
      answer: "Focus Mode provides a clean, minimal interface with no distractions — just your goals and progress. Game Mode adds the full gamified experience with animated effects, leaderboards, friend challenges, and roast notifications when you slack off."
    },
    {
      question: "Can I switch between modes after I choose?",
      answer: "Yes! You can switch between Focus Mode and Game Mode anytime in your settings. Your progress and data remain the same — only the interface and features change."
    },
    {
      question: "Is my data private?",
      answer: "Absolutely. We collect only what's necessary: your email, name, and habit data. Your information is never sold to third parties. See our Privacy Policy for full details."
    }
  ];

  return (
    <div className="min-h-screen bg-[#06080F] text-white overflow-x-hidden">
      {/* Navbar */}
      <nav 
        data-testid="landing-navbar"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#06080F]/90 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5" data-testid="logo">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight font-['Satoshi']">HabitRPG</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              <button 
                onClick={() => scrollToSection('features')}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('pricing')}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
                data-testid="nav-pricing"
              >
                Pricing
              </button>
              <button 
                onClick={() => scrollToSection('faq')}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
                data-testid="nav-faq"
              >
                FAQ
              </button>
            </div>

            {/* Auth buttons */}
            <div className="hidden lg:flex items-center gap-4">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button 
                    className="bg-white text-black hover:bg-zinc-200 font-medium px-5"
                    data-testid="nav-dashboard-btn"
                  >
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button 
                      variant="ghost" 
                      className="text-zinc-300 hover:text-white hover:bg-white/5 font-medium"
                      data-testid="nav-login-btn"
                    >
                      Sign in
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button 
                      className="bg-white text-black hover:bg-zinc-200 font-medium px-5"
                      data-testid="nav-signup-btn"
                    >
                      Start free
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button 
              className="lg:hidden p-2 text-zinc-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden bg-[#06080F]/98 backdrop-blur-xl border-b border-white/5"
            data-testid="mobile-menu"
          >
            <div className="px-6 py-6 space-y-4">
              <button 
                onClick={() => scrollToSection('features')}
                className="block w-full text-left py-2 text-zinc-300 hover:text-white"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('pricing')}
                className="block w-full text-left py-2 text-zinc-300 hover:text-white"
              >
                Pricing
              </button>
              <button 
                onClick={() => scrollToSection('faq')}
                className="block w-full text-left py-2 text-zinc-300 hover:text-white"
              >
                FAQ
              </button>
              <hr className="border-white/10" />
              {isAuthenticated ? (
                <Link to="/dashboard" className="block">
                  <Button className="w-full bg-white text-black hover:bg-zinc-200">Dashboard</Button>
                </Link>
              ) : (
                <div className="space-y-3">
                  <Link to="/login" className="block">
                    <Button variant="outline" className="w-full border-white/20 text-white">Sign in</Button>
                  </Link>
                  <Link to="/signup" className="block">
                    <Button className="w-full bg-white text-black hover:bg-zinc-200">Start free</Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section - Stripe Style */}
      <section 
        ref={heroRef}
        className="relative min-h-screen pt-20 lg:pt-0 overflow-hidden"
        data-testid="hero-section"
      >
        {/* Gradient Background - Stripe Style */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-transparent" />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-fuchsia-500/30 via-violet-600/20 to-transparent rounded-full blur-3xl translate-x-1/3 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-violet-700/20 via-purple-600/10 to-transparent rounded-full blur-3xl -translate-x-1/3 translate-y-1/4" />
          {/* Animated gradient orbs */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-3xl"
          />
        </div>

        {/* Hero Content - Split Layout */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 min-h-screen flex items-center">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full py-20 lg:py-0">
            {/* Left - Text Content */}
            <div className="order-2 lg:order-1">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h1 
                  className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight font-['Satoshi'] leading-[1.1] mb-6"
                  data-testid="hero-title"
                >
                  Habit infrastructure
                  <br />
                  <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                    for your life
                  </span>
                </h1>
                <p 
                  className="text-lg lg:text-xl text-zinc-400 mb-10 max-w-lg leading-relaxed"
                  data-testid="hero-subtitle"
                >
                  Turn daily habits into XP, levels, and streaks. Choose your experience — minimal focus or full RPG adventure.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link to="/signup">
                  <Button 
                    size="lg"
                    className="bg-white text-black hover:bg-zinc-200 font-semibold text-base px-8 h-12 w-full sm:w-auto"
                    data-testid="hero-cta-btn"
                  >
                    Start now
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button 
                    size="lg"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/5 font-medium text-base px-8 h-12 w-full sm:w-auto"
                  >
                    Sign in
                  </Button>
                </Link>
              </motion.div>

              {/* Social proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mt-12 flex items-center gap-6"
              >
                <div className="flex -space-x-2">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 border-2 border-[#0A0A0A] flex items-center justify-center text-xs font-medium">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-zinc-500">
                  Join <span className="text-white font-medium">2,000+</span> people building better habits
                </p>
              </motion.div>
            </div>

            {/* Right - Product Visualization */}
            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="order-1 lg:order-2"
            >
              <div className="relative">
                {/* Main product card */}
                <div className="relative bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
                  {/* Mock dashboard header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Good evening, Alex</p>
                        <p className="text-xs text-zinc-500">Level 4 — Achiever</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-medium text-orange-400">7 day streak</span>
                    </div>
                  </div>

                  {/* XP Progress */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-zinc-500">620 XP</span>
                      <span className="text-zinc-600">900 XP</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "69%" }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                      />
                    </div>
                  </div>

                  {/* Habits preview */}
                  <div className="space-y-3">
                    {[
                      { name: "Morning meditation", xp: "+25 XP", done: true },
                      { name: "30 min workout", xp: "+50 XP", done: true },
                      { name: "Read 20 pages", xp: "+25 XP", done: false },
                    ].map((habit, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                          habit.done 
                            ? 'bg-violet-500/5 border-violet-500/20' 
                            : 'bg-zinc-800/50 border-white/5'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                          habit.done 
                            ? 'bg-violet-500' 
                            : 'border border-zinc-600'
                        }`}>
                          {habit.done && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <span className={`flex-1 text-sm ${habit.done ? 'text-zinc-400 line-through' : 'text-white'}`}>
                          {habit.name}
                        </span>
                        <span className={`text-xs font-medium ${habit.done ? 'text-violet-400' : 'text-zinc-500'}`}>
                          {habit.xp}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Floating stat cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20, x: -20 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="absolute -bottom-6 -left-6 bg-zinc-900/90 backdrop-blur-xl rounded-xl border border-white/10 p-4 shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">This week</p>
                      <p className="text-lg font-bold text-white">+340 XP</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: -20, x: 20 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  transition={{ duration: 0.6, delay: 1 }}
                  className="absolute -top-4 -right-4 bg-zinc-900/90 backdrop-blur-xl rounded-xl border border-white/10 p-3 shadow-xl"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm font-medium text-white">Level Up!</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section - Stripe Grid Style */}
      <section id="features" className="py-24 lg:py-32 relative" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight font-['Satoshi'] mb-4">
              Everything you need to
              <br />
              <span className="text-zinc-500">build lasting habits</span>
            </h2>
          </motion.div>

          {/* Feature Grid - Stripe Style */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all hover:bg-zinc-900/80"
                data-testid={`feature-${index + 1}`}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <div className="text-violet-400">{feature.icon}</div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 font-['Satoshi']">
                  {feature.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works - Visual Section */}
      <section className="py-24 lg:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight font-['Satoshi'] mb-4">
              Two ways to play
            </h2>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
              Choose the experience that fits your style
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Focus Mode Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative p-8 rounded-3xl bg-zinc-900/50 border border-white/5 overflow-hidden group hover:border-white/10 transition-all"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-6">
                  <Eye className="w-7 h-7 text-zinc-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 font-['Satoshi']">Focus Mode</h3>
                <p className="text-zinc-500 mb-6">Less noise. Pure progress.</p>
                <ul className="space-y-3">
                  {["Minimal dark interface", "Data-first design", "No distractions", "Just you and your goals"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-zinc-400">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Check className="w-3 h-3 text-zinc-400" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Game Mode Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative p-8 rounded-3xl bg-gradient-to-br from-violet-950/50 to-fuchsia-950/30 border border-violet-500/20 overflow-hidden group hover:border-violet-500/30 transition-all"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20">
                  <Gamepad2 className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 font-['Satoshi']">Game Mode</h3>
                <p className="text-violet-300/80 mb-6">Level up your life. Make it interesting.</p>
                <ul className="space-y-3">
                  {["Animated XP bars & celebrations", "Streak flames & particles", "Roast notifications", "Full RPG experience"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-violet-200/70">
                      <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-violet-400" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 lg:py-32 border-t border-white/5" data-testid="pricing-section">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight font-['Satoshi'] mb-4">
              Simple pricing
            </h2>
            <p className="text-lg text-zinc-500 mb-12">
              Start free. No credit card required.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl bg-zinc-900/50 border border-white/5 text-left"
              data-testid="pricing-free"
            >
              <h3 className="text-lg font-semibold text-white mb-2 font-['Satoshi']">Free</h3>
              <p className="text-4xl font-bold text-white mb-1 font-['Satoshi']">$0</p>
              <p className="text-sm text-zinc-500 mb-6">Forever free</p>
              <ul className="space-y-3 mb-8">
                {["Unlimited habits", "XP & leveling system", "Focus & Game modes", "Progress analytics", "7-day history"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-zinc-400">
                    <Check className="w-4 h-4 text-violet-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/signup">
                <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                  Get started
                </Button>
              </Link>
            </motion.div>

            {/* Pro Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-violet-950/50 to-fuchsia-950/30 border border-violet-500/30 text-left relative overflow-hidden"
              data-testid="pricing-pro"
            >
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-violet-500/20 text-xs font-medium text-violet-300">
                Coming Soon
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 font-['Satoshi']">Pro</h3>
              <p className="text-4xl font-bold text-white mb-1 font-['Satoshi']">$4.99</p>
              <p className="text-sm text-zinc-500 mb-6">per month</p>
              <ul className="space-y-3 mb-8">
                {["Everything in Free", "Unlimited history", "Advanced analytics", "Custom themes", "Priority support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-violet-200/70">
                    <Check className="w-4 h-4 text-violet-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" disabled>
                Coming soon
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 lg:py-32 border-t border-white/5" data-testid="faq-section">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight font-['Satoshi'] mb-4">
              FAQs
            </h2>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-white/5 rounded-xl px-6 bg-zinc-900/30 data-[state=open]:border-white/10"
                data-testid={`faq-item-${index}`}
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline py-5 text-white">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-zinc-500 pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight font-['Satoshi'] mb-6">
              Ready to level up?
            </h2>
            <p className="text-lg text-zinc-500 mb-10 max-w-xl mx-auto">
              Join thousands of people building better habits. Start your journey today.
            </p>
            <Link to="/signup">
              <Button 
                size="lg"
                className="bg-white text-black hover:bg-zinc-200 font-semibold text-base px-8 h-12"
              >
                Get started for free
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 lg:px-8" data-testid="footer">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Company */}
            <div>
              <h4 className="font-semibold text-white mb-4 font-['Satoshi']">Company</h4>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white mb-4 font-['Satoshi']">Product</h4>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Pricing</button></li>
                <li><button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors">FAQ</button></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold text-white mb-4 font-['Satoshi']">Resources</h4>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li><a href="/help" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>

            {/* Logo */}
            <div>
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <Zap className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight font-['Satoshi'] text-white">HabitRPG</span>
              </Link>
              <p className="text-sm text-zinc-600">
                Build habits that stick.
              </p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 text-center text-sm text-zinc-600">
            <p>&copy; {new Date().getFullYear()} HabitRPG. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
