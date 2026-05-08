import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Zap, Dumbbell, BookOpen, Brain, Scale, Rocket, Gamepad2, Target, Lock, BarChart3, Bell, Trophy, MessageSquare, Flame, Sparkles, Eye, Crosshair } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const questions = [
  {
    id: 'main_goal',
    prompt: "What's your main goal right now?",
    options: [
      { id: 'active', icon: Dumbbell, label: 'Get more active', desc: 'Build a habit of moving your body regularly' },
      { id: 'learn', icon: BookOpen, label: 'Learn & grow', desc: 'Read more, study, develop new skills' },
      { id: 'mental', icon: Brain, label: 'Build mental discipline', desc: 'Improve focus, reduce procrastination' },
      { id: 'balance', icon: Scale, label: 'Balance my life', desc: 'Manage work, rest, and personal goals evenly' },
      { id: 'levelup', icon: Rocket, label: 'Level up overall', desc: 'Improve across all areas of life at once' },
    ]
  },
  {
    id: 'download_reason',
    prompt: "Why did you download this app?",
    options: [
      { id: 'fun', icon: Gamepad2, label: 'To have fun', desc: 'Make self-improvement feel like a game' },
      { id: 'workout', icon: Dumbbell, label: 'To work out more', desc: 'Stay on top of fitness goals' },
      { id: 'discipline', icon: Lock, label: 'To discipline myself', desc: 'Build real habits, hold myself accountable' },
      { id: 'track', icon: BarChart3, label: 'To track my progress', desc: 'See how far I\'ve come' },
      { id: 'other', icon: MessageSquare, label: 'Other', desc: 'Tell us why...' },
    ],
    hasOther: true
  },
  {
    id: 'consistency_level',
    prompt: "How consistent are you with your goals right now?",
    options: [
      { id: 'fire', icon: Flame, label: "I'm on fire", desc: 'Strong habits, want to level them up' },
      { id: 'better', icon: BarChart3, label: 'Getting better', desc: 'Improving but need more structure' },
      { id: 'hitormiss', icon: Target, label: 'Hit or miss', desc: 'Some days great, others I fall off' },
      { id: 'starting', icon: Sparkles, label: 'Just starting', desc: 'Struggle to stay consistent' },
      { id: 'chaos', icon: Brain, label: 'Total chaos', desc: 'Starting from zero' },
    ]
  },
  {
    id: 'accountability_style',
    prompt: "When you fall behind, what helps you get back on track?",
    options: [
      { id: 'progress', icon: BarChart3, label: 'Seeing my progress', desc: 'Graphs and stats' },
      { id: 'competition', icon: Trophy, label: 'Friendly competition', desc: 'Knowing others are ahead pushes me' },
      { id: 'reminders', icon: Bell, label: 'Reminders & nudges', desc: 'Just remind me' },
      { id: 'rewards', icon: Trophy, label: 'Rewards', desc: 'Give me something to earn' },
      { id: 'callout', icon: MessageSquare, label: 'Being called out', desc: 'Tough love, roast me a little' },
    ]
  },
  {
    id: 'app_mode',
    prompt: "How do you want to experience this app?",
    isModePicker: true,
    options: [
      { 
        id: 'focus', 
        icon: Eye, 
        label: 'Focus Mode', 
        tagline: 'Less noise. Pure progress.',
        desc: 'Clean, minimal interface. No distractions. Just your goals, your tasks, and your growth. Built for people who mean business.',
        image: 'https://images.unsplash.com/photo-1763596396590-81193928cdeb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwyfHxkYXJrJTIwZ2xvd2luZyUyMGFic3RyYWN0fGVufDB8fHx8MTc3NTA3ODQyOHww&ixlib=rb-4.1.0&q=85'
      },
      { 
        id: 'game', 
        icon: Gamepad2, 
        label: 'Game Mode', 
        tagline: 'Level up your life. Make it interesting.',
        desc: 'Full gamified experience. Earn XP, compete with friends, unlock rewards — and get roasted when you slack off. For people who want results AND a good time.',
        image: 'https://images.pexels.com/photos/7773745/pexels-photo-7773745.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940'
      },
    ]
  }
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [otherText, setOtherText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);

  const question = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleSelect = async (optionId) => {
    const newAnswers = { ...answers, [question.id]: optionId };
    setAnswers(newAnswers);

    // Handle "other" option
    if (question.hasOther && optionId === 'other') {
      return; // Wait for text input
    }

    // Save to backend
    try {
      const payload = { [question.id]: optionId };
      if (question.id === 'download_reason' && optionId !== 'other') {
        payload.download_reason_other = null;
      }
      const { data } = await axios.post(`${API}/users/onboarding`, payload);
      
      // Update auth state with the response so onboarding_completed is reflected
      if (data && data.onboarding_completed) {
        updateUser(data);
      }
    } catch (e) {
      console.error('Failed to save onboarding', e);
      if (e.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        return;
      }
    }

    // Move to next or finish
    if (currentStep < questions.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    } else {
      // Final step - show splash
      setSelectedMode(optionId);
      setShowSplash(true);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  };

  const handleOtherSubmit = async () => {
    if (!otherText.trim()) return;

    try {
      await axios.post(`${API}/users/onboarding`, {
        download_reason: 'other',
        download_reason_other: otherText
      });
    } catch (e) {
      console.error('Failed to save onboarding', e);
    }

    setCurrentStep(currentStep + 1);
  };

  // Splash screen
  if (showSplash) {
    return (
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center overflow-hidden">
        <AnimatePresence>
          {selectedMode === 'focus' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <Eye className="w-16 h-16 text-zinc-400 mx-auto" />
              </motion.div>
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold font-['Satoshi'] text-white"
              >
                Let's get to work.
              </motion.h1>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center relative"
            >
              {/* Particles */}
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    opacity: 0, 
                    scale: 0,
                    x: 0,
                    y: 0
                  }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: Math.random() * 400 - 200,
                    y: Math.random() * 400 - 200
                  }}
                  transition={{ 
                    duration: 2,
                    delay: Math.random() * 0.5
                  }}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-purple-500"
                />
              ))}
              
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                className="mb-6 relative"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mx-auto glow-purple">
                  <Gamepad2 className="w-10 h-10 text-white" />
                </div>
              </motion.div>
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold font-['Satoshi'] gradient-text"
              >
                Game Mode Activated
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-zinc-400 mt-2"
              >
                Let the adventure begin
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06080F] flex flex-col" data-testid="onboarding-page">
      {/* Header with progress */}
      <div className="p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm text-zinc-500">Step {currentStep + 1} of {questions.length}</span>
          </div>
          <Progress value={progress} className="h-1 bg-zinc-800" data-testid="onboarding-progress" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Persistent message */}
              <p className="text-sm text-zinc-500 text-center mb-6">
                Please answer these questions truthfully so that your answers can make this app, truly for you.
              </p>

              {/* Question */}
              <h2 
                className="text-2xl sm:text-3xl font-bold font-['Satoshi'] text-white text-center mb-8"
                data-testid="onboarding-question"
              >
                {question.prompt}
              </h2>

              {/* Options */}
              <div className={`grid gap-4 ${question.isModePicker ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                {question.options.map((option) => {
                  const Icon = option.icon;
                  const isSelected = answers[question.id] === option.id;

                  if (question.isModePicker) {
                    // Mode picker - special layout
                    return (
                      <motion.button
                        key={option.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelect(option.id)}
                        className={`relative overflow-hidden rounded-2xl border p-6 text-left transition-all ${
                          isSelected 
                            ? 'border-purple-500 bg-purple-500/10' 
                            : 'border-white/10 bg-zinc-900/50 hover:border-white/20'
                        }`}
                        data-testid={`onboarding-mode-${option.id}`}
                      >
                        {/* Background image */}
                        <div className="absolute inset-0 opacity-20">
                          <img src={option.image} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                        </div>

                        <div className="relative z-10">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
                            option.id === 'focus' 
                              ? 'bg-zinc-800' 
                              : 'bg-gradient-to-br from-purple-500 to-purple-700 glow-purple-sm'
                          }`}>
                            <Icon className="w-7 h-7 text-white" />
                          </div>

                          <h3 className="text-xl font-bold font-['Satoshi'] text-white mb-1">
                            {option.label}
                          </h3>
                          <p className={`text-sm font-medium mb-3 ${
                            option.id === 'focus' ? 'text-zinc-400' : 'text-purple-400'
                          }`}>
                            {option.tagline}
                          </p>
                          <p className="text-sm text-zinc-500 leading-relaxed">
                            {option.desc}
                          </p>
                        </div>
                      </motion.button>
                    );
                  }

                  // Regular option
                  return (
                    <motion.button
                      key={option.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelect(option.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-500/10' 
                          : 'border-white/10 bg-zinc-900/50 hover:border-white/20'
                      }`}
                      data-testid={`onboarding-option-${option.id}`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-white">{option.label}</p>
                        <p className="text-sm text-zinc-500">{option.desc}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Other text input */}
              {question.hasOther && answers[question.id] === 'other' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4"
                >
                  <Textarea
                    placeholder="Tell us why..."
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value.slice(0, 150))}
                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 resize-none"
                    rows={3}
                    data-testid="onboarding-other-input"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-zinc-500">{otherText.length}/150</span>
                    <Button
                      onClick={handleOtherSubmit}
                      disabled={!otherText.trim()}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="onboarding-other-submit"
                    >
                      Continue
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
