import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Sparkles, ArrowRight, ShieldCheck, Cpu, Layers } from 'lucide-react';

import { Navigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const { user, loginGoogle, loginDemo, loading } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#3B7597] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#8B1E2D]/15 to-[#457B9D]/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-[#151D2A] border border-[#232E42] rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#8B1E2D] to-[#E63946] shadow-lg shadow-[#8B1E2D]/30 border border-[#F4D35E]/30 mb-1">
            <span className="font-bold text-2xl text-white tracking-widest">R</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">EmailOrchestrator</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Enterprise Email Scheduler & BullMQ Rate-Limiting Engine
          </p>
        </div>

        {/* Login Options */}
        <div className="space-y-3 pt-2">
          {/* Real Google OAuth Login */}
          <button
            onClick={loginGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs rounded-xl shadow-md transition-all border border-slate-200 focus:outline-none"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google OAuth</span>
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-[#232E42] w-full" />
            <span className="bg-[#151D2A] px-3 text-[11px] text-slate-500 uppercase tracking-widest font-semibold shrink-0">
              OR FOR QUICK REVIEW
            </span>
          </div>

          {/* Instant Demo Login for Reviewer */}
          <Button
            variant="primary"
            size="lg"
            onClick={loginDemo}
            loading={loading}
            icon={<Sparkles className="w-4 h-4 text-[#F4D35E]" />}
            className="w-full font-bold text-xs py-3 bg-gradient-to-r from-[#8B1E2D] to-[#E63946] hover:from-[#8B1E2D]/90 hover:to-[#E63946]/90 text-white shadow-xl shadow-[#8B1E2D]/25 border border-[#F4D35E]/30"
          >
            Instant Demo Account Login
          </Button>
        </div>

        {/* Feature Highlights */}
        <div className="pt-4 border-t border-[#232E42]/80 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#66BB6A] shrink-0" />
            <span>BullMQ Delayed Queue</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#457B9D] shrink-0" />
            <span>Redis Sliding Window</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#A5D6A7] shrink-0" />
            <span>Restart Persistence</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F4D35E] shrink-0" />
            <span>Slack Rate-Limit Alerts</span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-600 mt-6">
        Outbox Labs / EmailOrchestrator Software Development Intern Hiring Assignment
      </p>
    </div>
  );
};
