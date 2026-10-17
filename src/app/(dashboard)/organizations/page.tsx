'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  Building2,
  PlusCircle,
  PauseCircle,
  PlayCircle,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Phone,
  Key,
  ShieldAlert,
  HelpCircle,
  FileText,
  Mail,
  Users,
  Loader2,
  ArrowRight,
  Filter,
  DollarSign,
  Activity,
  Layers,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  service_status: 'active' | 'paused' | 'suspended';
  billing_status: 'paid' | 'unpaid' | 'trial' | 'overdue';
  contact_email?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  waba_id?: string | null;
  phone_number_id?: string | null;
  phone_number?: string | null;
  whatsapp_status?: string | null;
  verified_name?: string | null;
  member_count: number;
  created_at: string;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accountId, switchOrganization, refreshProfile } = useAuth();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'paid' | 'overdue'>('all');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // Enrollment Form State
  const [enrollForm, setEnrollForm] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    wabaId: '',
    phoneNumberId: '',
    phoneNumber: '',
    accessToken: '',
    billingStatus: 'paid' as 'paid' | 'unpaid' | 'trial',
    serviceStatus: 'active' as 'active' | 'paused',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<{ name: string; inviteUrl?: string } | null>(null);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations || []);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      toast.error('Failed to load organizations directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Handle URL ?enroll=true
  useEffect(() => {
    if (searchParams.get('enroll') === 'true') {
      setShowEnrollModal(true);
    }
  }, [searchParams]);

  const handleSwitchWorkspace = async (orgId: string, orgName: string) => {
    if (orgId === accountId) return;
    setSwitchingId(orgId);
    try {
      const ok = await switchOrganization(orgId);
      if (ok) {
        toast.success(`Switched active workspace to "${orgName}"`);
        router.push('/dashboard');
        router.refresh();
      } else {
        toast.error('Failed to switch workspace');
      }
    } catch {
      toast.error('Error switching workspace');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleToggleServiceStatus = async (org: Organization) => {
    const nextStatus = org.service_status === 'active' ? 'paused' : 'active';
    setActionLoadingId(org.id);
    try {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceStatus: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed to update service status');

      toast.success(
        nextStatus === 'active'
          ? `Services resumed for "${org.name}"`
          : `Services paused for "${org.name}"`
      );

      setOrganizations((prev) =>
        prev.map((o) => (o.id === org.id ? { ...o, service_status: nextStatus } : o))
      );

      if (org.id === accountId) {
        await refreshProfile();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not toggle service status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleBillingStatus = async (org: Organization) => {
    const nextBilling = org.billing_status === 'paid' ? 'overdue' : 'paid';
    setActionLoadingId(org.id);
    try {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingStatus: nextBilling }),
      });
      if (!res.ok) throw new Error('Failed to update billing status');

      toast.success(`Billing status set to "${nextBilling.toUpperCase()}" for ${org.name}`);
      setOrganizations((prev) =>
        prev.map((o) => (o.id === org.id ? { ...o, billing_status: nextBilling } : o))
      );
    } catch (err: any) {
      toast.error(err?.message || 'Could not update billing status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollForm.name.trim()) {
      toast.error('Organization name is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrollForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to enroll organization');
      }

      toast.success(`Organization "${enrollForm.name}" enrolled successfully!`);
      setCreatedResult({
        name: enrollForm.name,
        inviteUrl: data.organization?.inviteUrl,
      });

      setEnrollForm({
        name: '',
        contactEmail: '',
        contactPhone: '',
        wabaId: '',
        phoneNumberId: '',
        phoneNumber: '',
        accessToken: '',
        billingStatus: 'paid',
        serviceStatus: 'active',
        notes: '',
      });

      await fetchOrganizations();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to enroll organization');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedInviteId(id);
    toast.success('Onboarding link copied to clipboard');
    setTimeout(() => setCopiedInviteId(null), 2500);
  };

  // Metrics
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((o) => o.service_status === 'active').length;
  const pausedOrgs = organizations.filter((o) => o.service_status === 'paused' || o.service_status === 'suspended').length;
  const paidOrgs = organizations.filter((o) => o.billing_status === 'paid').length;

  // Filtered List
  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.waba_id?.includes(searchQuery) ||
      org.phone_number?.includes(searchQuery) ||
      org.contact_email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return org.service_status === 'active';
    if (statusFilter === 'paused') return org.service_status === 'paused' || org.service_status === 'suspended';
    if (statusFilter === 'paid') return org.billing_status === 'paid';
    if (statusFilter === 'overdue') return org.billing_status === 'overdue' || org.billing_status === 'unpaid';

    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              Meta Tech Provider Multi-Tenant Command
            </span>
          </div>
          <h1 className="mt-2 font-rajdhani text-3xl font-bold uppercase tracking-wider text-white">
            Client Organizations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enroll and govern multiple client organizations without coexistence. Pause or resume WhatsApp services, manage WABA IDs, and control billing access.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGuide(!showGuide)}
            className="border-border/80 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Info className="h-3.5 w-3.5 text-primary" />
            {showGuide ? 'Hide Setup Guide' : 'Tech Provider Guide'}
          </Button>

          <Button
            onClick={() => {
              setCreatedResult(null);
              setShowEnrollModal(true);
            }}
            className="bg-gradient-to-r from-[#d4a017] via-[#f59e0b] to-[#d4a017] text-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-[0_0_20px_rgba(212,160,23,0.35)] hover:brightness-110 active:scale-[0.99] gap-1.5"
          >
            <PlusCircle className="h-4 w-4" />
            Enroll Organization
          </Button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/70 bg-card/60 backdrop-blur-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Enrolled
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {totalOrgs}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Client Organizations
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60 backdrop-blur-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                Active Services
              </p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                {activeOrgs}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Messaging & bots online
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60 backdrop-blur-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                Paused Services
              </p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">
                {pausedOrgs}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Billing / Admin hold
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <PauseCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60 backdrop-blur-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-primary uppercase tracking-wider">
                Paid Verified
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {paidOrgs}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Full CRM unlocked
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meta Tech Provider Architecture Guide (Non-Coexistence) */}
      {showGuide && (
        <Card className="border-primary/30 bg-primary/5 shadow-xl backdrop-blur-md overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-amber-400 to-primary" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-base text-foreground font-semibold">
                Meta Tech Provider Onboarding Architecture (No Coexistence Feature)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Because Meta Coexistence is not available on your provider tier, client numbers cannot run simultaneously on the mobile WhatsApp Business app and the Cloud API. Follow these 4 standard steps for each enrolled client:
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 space-y-1.5">
              <span className="inline-block px-2 py-0.5 rounded bg-primary/20 text-primary font-bold text-[10px]">
                STEP 1
              </span>
              <h4 className="font-semibold text-foreground">Dedicated Phone Number</h4>
              <p className="text-muted-foreground leading-relaxed">
                Use a clean virtual/SIM number or migrate by deleting the account inside the WhatsApp mobile app settings first.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 space-y-1.5">
              <span className="inline-block px-2 py-0.5 rounded bg-primary/20 text-primary font-bold text-[10px]">
                STEP 2
              </span>
              <h4 className="font-semibold text-foreground">Client WABA Setup</h4>
              <p className="text-muted-foreground leading-relaxed">
                In Meta Business Manager, create or connect the client’s WhatsApp Business Account (WABA) under your Tech Provider app.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 space-y-1.5">
              <span className="inline-block px-2 py-0.5 rounded bg-primary/20 text-primary font-bold text-[10px]">
                STEP 3
              </span>
              <h4 className="font-semibold text-foreground">Permanent Access Token</h4>
              <p className="text-muted-foreground leading-relaxed">
                Create a System User with <code className="text-primary font-mono text-[10px]">whatsapp_business_messaging</code> and <code className="text-primary font-mono text-[10px]">whatsapp_business_management</code>.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 space-y-1.5">
              <span className="inline-block px-2 py-0.5 rounded bg-primary/20 text-primary font-bold text-[10px]">
                STEP 4
              </span>
              <h4 className="font-semibold text-foreground">Enroll & Govern</h4>
              <p className="text-muted-foreground leading-relaxed">
                Add them using the button above. When clients pay bills, services run. When you want to stop/pause, toggle with 1 click.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search organizations by name, phone, email, or WABA ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 border-border bg-card/60 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'active', 'paused', 'paid', 'overdue'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all shrink-0 ${
                statusFilter === filter
                  ? 'bg-primary text-black font-bold shadow-md'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Organizations Directory Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading organizations...</p>
        </div>
      ) : filteredOrganizations.length === 0 ? (
        <Card className="border-border/60 bg-card/40 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No organizations found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-5">
            {searchQuery
              ? 'No enrolled organizations matched your search filter.'
              : 'You have not enrolled any client organizations yet. As a Meta Tech Provider, enroll your paying clients to give them full WhatsApp CRM capabilities.'}
          </p>
          <Button
            onClick={() => setShowEnrollModal(true)}
            size="sm"
            className="bg-primary text-black font-bold text-xs rounded-xl"
          >
            Enroll First Organization
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrganizations.map((org) => {
            const isCurrentActive = org.id === accountId;
            const isPaused = org.service_status === 'paused' || org.service_status === 'suspended';
            const isPaid = org.billing_status === 'paid';

            return (
              <Card
                key={org.id}
                className={`relative border transition-all duration-200 overflow-hidden backdrop-blur-md flex flex-col justify-between ${
                  isCurrentActive
                    ? 'border-primary/60 bg-primary/[0.04] shadow-[0_0_25px_-5px_rgba(212,175,55,0.2)] ring-1 ring-primary/30'
                    : 'border-border/70 bg-card/70 hover:border-border hover:bg-card/90'
                }`}
              >
                {/* Active Workspace Accent Tag */}
                {isCurrentActive && (
                  <div className="absolute top-0 right-0 bg-primary text-black text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                    Current Workspace
                  </div>
                )}

                <CardHeader className="p-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-amber-500/10 border border-primary/30 flex items-center justify-center font-bold text-primary shrink-0 text-base">
                      {org.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground text-sm truncate" title={org.name}>
                          {org.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        {/* Service Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isPaused
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                            }`}
                          />
                          {isPaused ? 'Services Paused' : 'Services Active'}
                        </span>

                        {/* Billing Badge */}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            isPaid
                              ? 'bg-primary/10 text-primary border border-primary/25'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {org.billing_status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-4 py-2 space-y-2 text-xs flex-1">
                  {/* WhatsApp Details */}
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Phone className="h-3 w-3" />
                        Phone Number:
                      </span>
                      <span className="font-mono text-foreground font-medium">
                        {org.phone_number || 'Not connected'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Key className="h-3 w-3" />
                        WABA ID:
                      </span>
                      <span className="font-mono text-foreground font-medium truncate max-w-[140px]">
                        {org.waba_id || '—'}
                      </span>
                    </div>

                    {org.contact_email && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Mail className="h-3 w-3" />
                          Contact:
                        </span>
                        <span className="text-foreground truncate max-w-[140px]">
                          {org.contact_email}
                        </span>
                      </div>
                    )}
                  </div>

                  {org.notes && (
                    <p className="text-[11px] text-muted-foreground italic line-clamp-2 px-1">
                      "{org.notes}"
                    </p>
                  )}
                </CardContent>

                {/* Card Actions Footer */}
                <div className="p-3 border-t border-border/60 bg-muted/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Pause / Resume Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleServiceStatus(org)}
                      disabled={actionLoadingId === org.id}
                      className={`h-8 text-xs font-semibold px-2.5 rounded-lg gap-1 transition-all ${
                        isPaused
                          ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                          : 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10'
                      }`}
                      title={isPaused ? 'Resume messaging and automations' : 'Pause messaging services for this client'}
                    >
                      {actionLoadingId === org.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isPaused ? (
                        <>
                          <PlayCircle className="h-3.5 w-3.5" />
                          Resume
                        </>
                      ) : (
                        <>
                          <PauseCircle className="h-3.5 w-3.5" />
                          Pause
                        </>
                      )}
                    </Button>

                    {/* Toggle Billing Paid / Overdue */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleBillingStatus(org)}
                      disabled={actionLoadingId === org.id}
                      className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
                      title="Toggle Billing Paid status"
                    >
                      <DollarSign className="h-3 w-3 mr-0.5" />
                      {isPaid ? 'Paid' : 'Unpaid'}
                    </Button>
                  </div>

                  {/* Switch Workspace Button */}
                  <Button
                    size="sm"
                    onClick={() => handleSwitchWorkspace(org.id, org.name)}
                    disabled={isCurrentActive || switchingId === org.id}
                    className={`h-8 text-xs font-semibold px-3 rounded-lg gap-1.5 ${
                      isCurrentActive
                        ? 'bg-muted text-muted-foreground cursor-default'
                        : 'bg-primary text-black hover:brightness-110 active:scale-95'
                    }`}
                  >
                    {switchingId === org.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isCurrentActive ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-primary" />
                        Active
                      </>
                    ) : (
                      <>
                        Switch
                        <ChevronRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Enroll New Organization Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="relative w-full max-w-2xl border border-white/10 bg-[#0b0914] shadow-2xl rounded-2xl overflow-hidden my-8">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4a017] to-transparent opacity-90" />

            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] mb-2 uppercase">
                    Tech Provider Provisioning
                  </Badge>
                  <CardTitle className="text-xl font-bold uppercase tracking-wider text-white">
                    Enroll New Organization
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400 mt-1">
                    Add a paying client organization. Give them full unlocked access to CRM, Live Chat, Broadcasts, and Bot Automations.
                  </CardDescription>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEnrollModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-2 space-y-4">
              {createdResult ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Organization "{createdResult.name}" Enrolled!
                  </h3>
                  <p className="text-xs text-gray-300">
                    The organization has been provisioned. All WhatsApp services and features are fully unlocked.
                  </p>

                  {createdResult.inviteUrl && (
                    <div className="mt-4 p-3 bg-black/50 rounded-xl border border-white/10 text-left space-y-1.5">
                      <Label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                        Client Onboarding Invite Link
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={createdResult.inviteUrl}
                          className="h-8 text-xs font-mono bg-black/60 border-white/10 text-white"
                        />
                        <Button
                          size="sm"
                          onClick={() => copyToClipboard(createdResult.inviteUrl!, 'modal')}
                          className="h-8 bg-primary text-black font-semibold text-xs shrink-0"
                        >
                          {copiedInviteId === 'modal' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Share this link with your client so they can register their account under this organization without public exposure.
                      </p>
                    </div>
                  )}

                  <div className="pt-2 flex justify-center gap-2">
                    <Button
                      onClick={() => {
                        setCreatedResult(null);
                        setShowEnrollModal(false);
                      }}
                      className="bg-primary text-black font-bold text-xs rounded-xl"
                    >
                      Done & Return to Directory
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEnrollSubmit} className="space-y-4">
                  {/* Organization & Contact Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-300 font-semibold">
                        Organization Name *
                      </Label>
                      <Input
                        required
                        placeholder="e.g. Apex Health Clinic"
                        value={enrollForm.name}
                        onChange={(e) => setEnrollForm({ ...enrollForm, name: e.target.value })}
                        className="h-9 bg-[#130f21] border-white/10 text-xs text-white placeholder:text-gray-500 rounded-lg"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-300 font-semibold">
                        Client Contact Email
                      </Label>
                      <Input
                        type="email"
                        placeholder="owner@clientbusiness.com"
                        value={enrollForm.contactEmail}
                        onChange={(e) => setEnrollForm({ ...enrollForm, contactEmail: e.target.value })}
                        className="h-9 bg-[#130f21] border-white/10 text-xs text-white placeholder:text-gray-500 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* WhatsApp Cloud API Configuration (Non-Coexistence) */}
                  <div className="rounded-xl border border-white/10 bg-[#130f21]/60 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <Phone className="h-3.5 w-3.5" />
                        WhatsApp Cloud API Credentials (No Coexistence)
                      </span>
                      <span className="text-[10px] text-gray-400">Optional now, configure anytime</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-gray-300">
                          Dedicated WhatsApp Phone Number
                        </Label>
                        <Input
                          placeholder="+1 555 123 4567"
                          value={enrollForm.phoneNumber}
                          onChange={(e) => setEnrollForm({ ...enrollForm, phoneNumber: e.target.value })}
                          className="h-8 bg-black/40 border-white/10 text-xs text-white placeholder:text-gray-600 rounded-lg font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-gray-300">
                          Meta Phone Number ID
                        </Label>
                        <Input
                          placeholder="e.g. 102938475610293"
                          value={enrollForm.phoneNumberId}
                          onChange={(e) => setEnrollForm({ ...enrollForm, phoneNumberId: e.target.value })}
                          className="h-8 bg-black/40 border-white/10 text-xs text-white placeholder:text-gray-600 rounded-lg font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-gray-300">
                          Meta WABA ID (Business Account ID)
                        </Label>
                        <Input
                          placeholder="e.g. 987654321098765"
                          value={enrollForm.wabaId}
                          onChange={(e) => setEnrollForm({ ...enrollForm, wabaId: e.target.value })}
                          className="h-8 bg-black/40 border-white/10 text-xs text-white placeholder:text-gray-600 rounded-lg font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-gray-300">
                          Permanent System User Token
                        </Label>
                        <Input
                          type="password"
                          placeholder="EAA..."
                          value={enrollForm.accessToken}
                          onChange={(e) => setEnrollForm({ ...enrollForm, accessToken: e.target.value })}
                          className="h-8 bg-black/40 border-white/10 text-xs text-white placeholder:text-gray-600 rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Billing & Service Status Control */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-300 font-semibold">
                        Billing Status (Bill Payment Verification)
                      </Label>
                      <select
                        value={enrollForm.billingStatus}
                        onChange={(e) =>
                          setEnrollForm({
                            ...enrollForm,
                            billingStatus: e.target.value as 'paid' | 'unpaid' | 'trial',
                          })
                        }
                        className="w-full h-9 rounded-lg border border-white/10 bg-[#130f21] px-3 text-xs text-white focus:outline-none"
                      >
                        <option value="paid">Paid & Verified (Full Services Unlocked)</option>
                        <option value="trial">Trial / Grace Period</option>
                        <option value="unpaid">Unpaid (Awaiting Payment)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-300 font-semibold">
                        Initial Service Status
                      </Label>
                      <select
                        value={enrollForm.serviceStatus}
                        onChange={(e) =>
                          setEnrollForm({
                            ...enrollForm,
                            serviceStatus: e.target.value as 'active' | 'paused',
                          })
                        }
                        className="w-full h-9 rounded-lg border border-white/10 bg-[#130f21] px-3 text-xs text-white focus:outline-none"
                      >
                        <option value="active">Active (Messaging Online)</option>
                        <option value="paused">Paused / Stopped (Service On Hold)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300 font-semibold">
                      Contract & Onboarding Notes
                    </Label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Billed quarterly via invoice #8492. Client owner: Dr. Sarah."
                      value={enrollForm.notes}
                      onChange={(e) => setEnrollForm({ ...enrollForm, notes: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#130f21] p-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEnrollModal(false)}
                      className="border-white/10 text-xs text-gray-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-gradient-to-r from-[#d4a017] via-[#f59e0b] to-[#d4a017] text-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-[0_0_20px_rgba(212,160,23,0.35)] hover:brightness-110 active:scale-[0.99] gap-1.5"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Enroll & Provision
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
