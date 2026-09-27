import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Plus, LogOut, Activity, Hash, CheckCircle, AlertCircle } from 'lucide-react';

interface HeaderProps {
  onOpenCompose: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCompose }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-[#3B7597]/90 backdrop-blur-md border-b border-[#232E42] px-6 py-3.5 flex items-center justify-between">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#8B1E2D] to-[#E63946] flex items-center justify-center shadow-md shadow-[#8B1E2D]/20 border border-[#F4D35E]/30">
            <span className="font-bold text-white text-lg tracking-wider">R</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base tracking-tight font-sans">ReachInbox</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#8B1E2D]/10 text-[#F4D35E] border border-[#8B1E2D]/20">
                Scheduler
              </span>
            </div>
            <p className="text-xs text-slate-400">Enterprise Cold Outreach Queue</p>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800 hidden sm:block" />

        {/* Live Queue Admin Dashboard Link */}
        <a
          href={import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '') + '/admin/queues' : '/admin/queues'}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#F4D35E] transition-colors bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-[#457B9D]/30"
          title="Open BullMQ Live Dashboard"
        >
          <Activity className="w-3.5 h-3.5 text-[#457B9D] animate-pulse" />
          <span>BullMQ Dashboard</span>
        </a>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-3">
        {/* Slack Connection Status Badge */}
        {user && (
          <a
            href="/settings"
            className={`hidden md:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${user.slackConnected
                ? 'bg-[#66BB6A]/10 text-[#66BB6A] border-[#66BB6A]/20 hover:border-[#66BB6A]/40'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
              }`}
            title={user.slackConnected ? 'Slack Rate Limit Alerts Connected' : 'Connect Slack for Rate Limit Alerts'}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>{user.slackConnected ? 'Slack Connected' : 'Connect Slack'}</span>
            {user.slackConnected ? (
              <CheckCircle className="w-3 h-3 text-[#66BB6A]" />
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-400" />
            )}
          </a>
        )}

        {/* Compose CTA */}
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onOpenCompose}>
          Compose Email
        </Button>

        <div className="h-6 w-px bg-slate-800" />

        {/* User Profile */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400">
                  {user.name.charAt(0)}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-slate-200 leading-tight">{user.name}</p>
                <p className="text-[11px] text-slate-400 leading-tight">{user.email}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-slate-400 hover:text-rose-400"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
