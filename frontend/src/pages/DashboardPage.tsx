import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Header } from '../components/layout/Header';
import { ScheduledTable } from '../components/dashboard/ScheduledTable';
import { SentTable } from '../components/dashboard/SentTable';
import { SearchBar } from '../components/dashboard/SearchBar';
import { ComposeModal } from '../components/compose/ComposeModal';
import { Email, PaginatedResponse } from '../types';
import { useAuth } from '../hooks/useAuth';
import {
  Clock,
  Send,
  Calendar,
  Layers,
  Zap,
  Activity,
  Plus,
  RefreshCw,
  Hash,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // 1. Fetch Scheduled Emails (Auto-poll every 3 seconds for live worker updates)
  const {
    data: scheduledData,
    isLoading: loadingScheduled,
    refetch: refetchScheduled,
  } = useQuery<PaginatedResponse<Email>>({
    queryKey: ['scheduled-emails', page],
    queryFn: async () => {
      const res = await api.get(`/emails/scheduled?page=${page}&limit=10`);
      return res.data;
    },
    refetchInterval: 3000,
  });

  // 2. Fetch Sent Emails (Auto-poll every 3 seconds)
  const {
    data: sentData,
    isLoading: loadingSent,
    refetch: refetchSent,
  } = useQuery<PaginatedResponse<Email>>({
    queryKey: ['sent-emails', page],
    queryFn: async () => {
      const res = await api.get(`/emails/sent?page=${page}&limit=10`);
      return res.data;
    },
    refetchInterval: 3000,
  });

  // 3. Search Emails via Elasticsearch / DB Fallback
  const { data: searchData, isLoading: loadingSearch } = useQuery<PaginatedResponse<Email>>({
    queryKey: ['search-emails', searchQuery, page],
    queryFn: async () => {
      if (!searchQuery.trim()) return null as any;
      const res = await api.get(`/emails/search?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=10`);
      return res.data;
    },
    enabled: searchQuery.trim().length > 0,
  });

  const handleComposeSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });
    queryClient.invalidateQueries({ queryKey: ['sent-emails'] });
  };

  const isSearching = searchQuery.trim().length > 0;
  const currentItems = isSearching
    ? searchData?.items || []
    : activeTab === 'scheduled'
      ? scheduledData?.items || []
      : sentData?.items || [];

  const totalCount = isSearching
    ? searchData?.total || 0
    : activeTab === 'scheduled'
      ? scheduledData?.total || 0
      : sentData?.total || 0;

  const totalPages = isSearching
    ? searchData?.totalPages || 1
    : activeTab === 'scheduled'
      ? scheduledData?.totalPages || 1
      : sentData?.totalPages || 1;

  const activeSender = user?.senders?.[0];

  return (
    <div className="min-h-screen bg-[#3B7597] flex flex-col font-sans">
      {/* Navigation Header */}
      <Header onOpenCompose={() => setIsComposeOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Overview Banner & Slack Alert Status */}
        {!user?.slackConnected && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="font-semibold text-white">Slack Notifications Disconnected:</strong> Connect your Slack workspace to receive real-time alerts when hourly rate limits are hit.
              </div>
            </div>
            <a
              href={import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '') + '/api/slack/connect' : '/api/slack/connect'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-medium shrink-0 transition-colors"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Connect Slack OAuth</span>
            </a>
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#151D2A] border border-[#232E42] space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Scheduled Queue</span>
              <Clock className="w-4 h-4 text-[#F4D35E]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">{scheduledData?.total || 0}</span>
              <span className="text-[11px] text-slate-500">delayed jobs</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#151D2A] border border-[#232E42] space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Total Sent</span>
              <Send className="w-4 h-4 text-[#66BB6A]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">{sentData?.total || 0}</span>
              <span className="text-[11px] text-slate-500">delivered emails</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#151D2A] border border-[#232E42] space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Hourly Sender Limit</span>
              <Zap className="w-4 h-4 text-[#8B1E2D]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">
                {activeSender?.maxEmailsPerHour || 100}
              </span>
              <span className="text-[11px] text-slate-500">emails / hour</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#151D2A] border border-[#232E42] space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Worker Concurrency</span>
              <Activity className="w-4 h-4 text-[#457B9D] animate-pulse" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">10</span>
              <span className="text-[11px] text-slate-500">parallel threads</span>
            </div>
          </div>
        </div>

        {/* Dashboard Main Table Section */}
        <div className="bg-[#151D2A] border border-[#232E42] rounded-2xl shadow-xl overflow-hidden">
          {/* Controls Bar: Tabs & Elasticsearch Search */}
          <div className="p-4 border-b border-[#232E42] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#0B0F17]/40">
            {/* Tabs */}
            <div className="flex items-center gap-2 bg-[#0B0F17] p-1 rounded-xl border border-[#232E42]">
              <button
                onClick={() => {
                  setActiveTab('scheduled');
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'scheduled' && !isSearching
                    ? 'bg-[#8B1E2D] text-white shadow-md shadow-[#8B1E2D]/20'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Scheduled Emails</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10">
                  {scheduledData?.total || 0}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('sent');
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'sent' && !isSearching
                    ? 'bg-[#8B1E2D] text-white shadow-md shadow-[#8B1E2D]/20'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Sent & History</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10">
                  {sentData?.total || 0}
                </span>
              </button>
            </div>

            {/* Elasticsearch Search Input */}
            <SearchBar
              query={searchQuery}
              onQueryChange={(q) => {
                setSearchQuery(q);
                setPage(1);
              }}
              searchSource={searchData?.source}
              isSearching={loadingSearch}
            />
          </div>

          {/* Table Render */}
          {isSearching ? (
            activeTab === 'scheduled' ? (
              <ScheduledTable emails={currentItems} loading={loadingSearch} />
            ) : (
              <SentTable emails={currentItems} loading={loadingSearch} />
            )
          ) : activeTab === 'scheduled' ? (
            <ScheduledTable emails={scheduledData?.items || []} loading={loadingScheduled} />
          ) : (
            <SentTable emails={sentData?.items || []} loading={loadingSent} />
          )}

          {/* Table Footer Pagination */}
          <div className="px-6 py-3.5 border-t border-[#232E42] flex items-center justify-between text-xs text-slate-400 bg-[#0B0F17]/30">
            <span>
              Showing Page <strong className="text-slate-200">{page}</strong> of{' '}
              <strong className="text-slate-200">{totalPages}</strong> ({totalCount} total records)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={handleComposeSuccess}
      />
    </div>
  );
};
