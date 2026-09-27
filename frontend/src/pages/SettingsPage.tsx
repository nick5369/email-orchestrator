import React from 'react';
import { Header } from '../components/layout/Header';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Hash, CheckCircle2, AlertTriangle, ShieldCheck, Zap, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { user, refetchUser } = useAuth();
  const navigate = useNavigate();

  const handleDisconnectSlack = async () => {
    try {
      await api.post('/slack/disconnect');
      toast.success('Slack integration disconnected successfully.');
      await refetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to disconnect Slack');
    }
  };

  return (
    <div className="min-h-screen bg-[#3B7597] flex flex-col font-sans">
      <Header onOpenCompose={() => navigate('/')} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white">Integrations & Rate Limit Alerts</h1>
          <p className="text-xs text-slate-400">
            Configure real Slack OAuth workspace authorization to receive live rate-limit breach notifications.
          </p>
        </div>

        {/* Slack OAuth Card */}
        <div className="bg-[#151D2A] border border-[#232E42] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
                <Hash className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Slack OAuth 2.0 Integration
                  {user?.slackConnected && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  Sends automated alerts to your Slack channel when a sender reaches their hourly rate limit.
                </p>
              </div>
            </div>

            {user?.slackConnected ? (
              <Button variant="danger" size="sm" onClick={handleDisconnectSlack}>
                Disconnect Slack
              </Button>
            ) : (
              <a
                href={import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '') + '/api/slack/connect' : '/api/slack/connect'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all border border-emerald-500/30"
              >
                <Hash className="w-4 h-4" /> Connect Slack Workspace
              </a>
            )}
          </div>

          {user?.slackConnected && user.slackIntegration && (
            <div className="p-4 bg-[#0B0F17] border border-[#232E42] rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Slack Team Workspace:</span>
                <strong className="font-semibold text-white">{user.slackIntegration.slackTeamName}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Target Notification Channel:</span>
                <span className="font-mono text-indigo-300">#{user.slackIntegration.channelName || 'general'}</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
