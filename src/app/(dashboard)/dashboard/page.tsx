"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency } from '@/lib/currency'
import {
  MessageSquare,
  UserPlus,
  DollarSign,
  Send,
  Building2,
  Users,
  GitBranch,
  Radio,
  Zap,
  Workflow,
  Bot,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  Smartphone,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react'

import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadPipelineDonut,
  loadResponseTime,
} from '@/lib/dashboard/queries'
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  PipelineDonutData,
  ResponseTimeSummary,
} from '@/lib/dashboard/types'

import { MetricCard } from '@/components/dashboard/metric-card'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import { ConversationsChart } from '@/components/dashboard/conversations-chart'
import { PipelineDonut } from '@/components/dashboard/pipeline-donut'
import { ResponseTimeChart } from '@/components/dashboard/response-time-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

type RangeDays = 7 | 30 | 90

export default function DashboardPage() {
  const t = useTranslations('Dashboard.page')
  const {
    account,
    accountId,
    serviceStatus,
    billingStatus,
    isServicesPaused,
    defaultCurrency,
    refreshProfile,
  } = useAuth()

  const [metrics, setMetrics] = useState<MetricsBundle | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  const [range, setRange] = useState<RangeDays>(30)
  const [series, setSeries] = useState<Record<RangeDays, ConversationsSeriesPoint[] | null>>({
    7: null,
    30: null,
    90: null,
  })
  const [seriesLoading, setSeriesLoading] = useState(true)

  const [pipeline, setPipeline] = useState<PipelineDonutData | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(true)

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(null)
  const [responseTimeLoading, setResponseTimeLoading] = useState(true)

  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)

  const [orgStats, setOrgStats] = useState<{ total: number; active: number; paused: number } | null>(null)
  const [togglingStatus, setTogglingStatus] = useState(false)

  const loadAll = useCallback(() => {
    const db = createClient()

    void loadMetrics(db)
      .then((m) => setMetrics(m))
      .catch((err) => console.error('[dashboard] metrics failed:', err))
      .finally(() => setMetricsLoading(false))

    void loadConversationsSeries(db, 30)
      .then((s) => setSeries((prev) => ({ ...prev, 30: s })))
      .catch((err) => console.error('[dashboard] series failed:', err))
      .finally(() => setSeriesLoading(false))

    void loadPipelineDonut(db)
      .then((p) => setPipeline(p))
      .catch((err) => console.error('[dashboard] pipeline failed:', err))
      .finally(() => setPipelineLoading(false))

    void loadResponseTime(db)
      .then((r) => setResponseTime(r))
      .catch((err) => console.error('[dashboard] response time failed:', err))
      .finally(() => setResponseTimeLoading(false))

    void loadActivity(db, 50)
      .then((a) => setActivity(a))
      .catch((err) => console.error('[dashboard] activity failed:', err))
      .finally(() => setActivityLoading(false))

    // Load Tech Provider organizations summary
    fetch('/api/organizations')
      .then((res) => res.json())
      .then((data) => {
        if (data.organizations && Array.isArray(data.organizations)) {
          const total = data.organizations.length
          const active = data.organizations.filter((o: any) => o.service_status === 'active').length
          const paused = data.organizations.filter((o: any) => o.service_status === 'paused' || o.service_status === 'suspended').length
          setOrgStats({ total, active, paused })
        }
      })
      .catch((err) => console.warn('Could not load org stats:', err))
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r)
      if (series[r] !== null) return
      setSeriesLoading(true)
      const db = createClient()
      loadConversationsSeries(db, r)
        .then((s) => setSeries((prev) => ({ ...prev, [r]: s })))
        .catch((err) => console.error('[dashboard] series failed:', err))
        .finally(() => setSeriesLoading(false))
    },
    [series],
  )

  const handleToggleCurrentOrgService = async () => {
    if (!accountId) return
    const nextStatus = isServicesPaused ? 'active' : 'paused'
    setTogglingStatus(true)
    try {
      const res = await fetch(`/api/organizations/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceStatus: nextStatus }),
      })
      if (!res.ok) throw new Error('Failed to update service status')
      toast.success(
        nextStatus === 'active'
          ? 'Services resumed! Outbound messaging is enabled.'
          : 'Services paused for this organization.'
      )
      await refreshProfile()
    } catch (err: any) {
      toast.error(err?.message || 'Could not update status')
    } finally {
      setTogglingStatus(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Category 1: Tech Provider Command & Active Workspace Header */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d0a1a] via-[#141026] to-[#0d0a1a] p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4a017] to-transparent opacity-90" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] font-semibold uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                Meta Tech Provider Suite
              </span>

              {/* Service Status Pill */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  isServicesPaused
                    ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300'
                    : 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    isServicesPaused ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-ping'
                  }`}
                />
                {isServicesPaused ? 'Services Paused' : 'Services Active'}
              </span>

              {/* Billing Status Pill */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider">
                Billing: {billingStatus.toUpperCase()} (Full CRM Access)
              </span>
            </div>

            <h1
              className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {account?.name || 'My Organization'}
            </h1>

            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              Every enrolled organization receives complete access to the WhatsApp CRM. Switch workspaces anytime or pause services for non-payment.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleCurrentOrgService}
              disabled={togglingStatus}
              className={`h-9 text-xs font-semibold rounded-xl gap-1.5 transition-all ${
                isServicesPaused
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              {isServicesPaused ? (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Resume Services
                </>
              ) : (
                <>
                  <PauseCircle className="h-4 w-4" />
                  Pause Services
                </>
              )}
            </Button>

            <Link href="/organizations">
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-white/15 bg-white/5 text-xs text-white hover:bg-white/10 rounded-xl gap-1.5"
              >
                <Building2 className="h-4 w-4 text-primary" />
                All Organizations ({orgStats?.total || 1})
              </Button>
            </Link>

            <Link href="/organizations?enroll=true">
              <Button
                size="sm"
                className="h-9 bg-gradient-to-r from-[#d4a017] via-[#f59e0b] to-[#d4a017] text-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-[0_0_20px_rgba(212,160,23,0.35)] hover:brightness-110 active:scale-95 gap-1.5"
              >
                <PlusCircle className="h-4 w-4" />
                Enroll Client
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Category 2: Clear Categorized Command Hub */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
            Navigation Categories & Quick Actions
          </h2>
          <span className="text-[11px] text-muted-foreground">
            All services unlocked for enrolled accounts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Group A: Tech Provider Governance */}
          <div className="rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                1. Provider & Organizations
              </span>
              <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                Multi-Tenant
              </span>
            </div>

            <div className="space-y-1.5">
              <Link
                href="/organizations"
                className="flex items-center justify-between rounded-xl p-2.5 hover:bg-muted/70 transition-colors group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary">
                      Manage Organizations
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      View all clients, WABAs, active vs paused
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/organizations?enroll=true"
                className="flex items-center justify-between rounded-xl p-2.5 hover:bg-muted/70 transition-colors group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <PlusCircle className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary">
                      Enroll New Client
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Add paying business & configure phone/WABA
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/settings?tab=whatsapp"
                className="flex items-center justify-between rounded-xl p-2.5 hover:bg-muted/70 transition-colors group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Smartphone className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary">
                      WhatsApp API & WABA
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Tokens, phone IDs, and Webhook verification
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Group B: Customer CRM & Live Chat */}
          <div className="rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00f0ff] flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                2. Live Chat & CRM
              </span>
              <span className="text-[10px] bg-[#00f0ff]/10 text-[#00f0ff] px-2 py-0.5 rounded-full font-semibold">
                Operations
              </span>
            </div>

            <div className="space-y-1.5">
              <Link
                href="/inbox"
                className="flex items-center justify-between rounded-xl p-2.5 hover:bg-muted/70 transition-colors group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] flex items-center justify-center">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary">
                      Team Live Inbox
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Real-time customer WhatsApp conversations
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/contacts"
                className="flex items-center justify-between rounded-xl p-2.5 hover:bg-muted/70 transition-colors group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary">
                      Contacts & Audiences
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Customer database, tags, custom fields
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/pipelines"
                className="flex items-center justify-between rounded-xl p-2.5 hover:bg-muted/70 transition-colors group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <GitBranch className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary">
                      Sales Pipelines
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Deals, stages, and lead conversion funnel
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Group C: Campaigns, Flows & AI */}
          <div className="rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#ff2a85] flex items-center gap-1.5">
                <Radio className="h-4 w-4" />
                3. Campaigns & Automation
              </span>
              <span className="text-[10px] bg-[#ff2a85]/10 text-[#ff2a85] px-2 py-0.5 rounded-full font-semibold">
                Marketing
              </span>
            </div>

            <div className="space-y-1.5">
              <Link
                href="/broadcasts"
                className="flex items-center justify-between rounded-xl p-2.5 hover:bg-muted/70 transition-colors group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#ff2a85]/10 text-[#ff2a85] flex items-center justify-center">
                    <Radio className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary">
                      Broadcast Campaigns
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Bulk WhatsApp template sends & delivery stats
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/flows"
                className="flex items-center justify-between rounded-xl p-2.5 hover:bg-muted/70 transition-colors group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Workflow className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary">
                      Interactive Chat Flows
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Visual drag-and-drop conversational bots
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/agents"
                className="flex items-center justify-between rounded-xl p-2.5 hover:bg-muted/70 transition-colors group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary">
                      AI WhatsApp Agent
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Knowledge base & smart autonomous replies
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Category 3: Live Real-Time Analytics & KPIs */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
          Operational Metrics ({account?.name || 'Workspace'})
        </h2>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metricsLoading || !metrics ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <MetricCard
                title={t('activeConversations')}
                value={metrics.activeConversations.current.toLocaleString()}
                icon={MessageSquare}
                delta={{
                  sign: metrics.activeConversations.previous,
                  label: deltaLabel(
                    metrics.activeConversations.previous,
                    t('newTodayVsYesterday'),
                    t('noChange', { suffix: t('newTodayVsYesterday') })
                  ),
                }}
              />
              <MetricCard
                title={t('newContactsToday')}
                value={metrics.newContactsToday.current.toLocaleString()}
                icon={UserPlus}
                delta={{
                  sign:
                    metrics.newContactsToday.current - metrics.newContactsToday.previous,
                  label: deltaLabel(
                    metrics.newContactsToday.current - metrics.newContactsToday.previous,
                    t('vsYesterday'),
                    t('noChange', { suffix: t('vsYesterday') })
                  ),
                }}
              />
              <MetricCard
                title={t('openDealsValue')}
                value={formatCurrency(metrics.openDealsValue, defaultCurrency)}
                icon={DollarSign}
                subtitle={t('openDeals', { count: metrics.openDealsCount })}
              />
              <MetricCard
                title={t('messagesSentToday')}
                value={metrics.messagesSentToday.current.toLocaleString()}
                icon={Send}
                delta={{
                  sign:
                    metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                  label: deltaLabel(
                    metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                    t('vsYesterday'),
                    t('noChange', { suffix: t('vsYesterday') })
                  ),
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="h-full lg:col-span-3">
          <ConversationsChart
            series={series}
            loading={seriesLoading}
            range={range}
            onRangeChange={handleRangeChange}
          />
        </div>
        <div className="h-full lg:col-span-2">
          <PipelineDonut
            data={pipeline}
            loading={pipelineLoading}
            currency={defaultCurrency}
          />
        </div>
      </div>

      {/* Response time */}
      <ResponseTimeChart data={responseTime} loading={responseTimeLoading} />

      {/* Activity feed */}
      <ActivityFeed items={activity} loading={activityLoading} />
    </div>
  )
}

function deltaLabel(delta: number, suffix: string, noChangeLabel: string): string {
  if (delta === 0) return noChangeLabel
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString()} ${suffix}`
}
