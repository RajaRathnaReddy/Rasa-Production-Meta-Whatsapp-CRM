'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  Building2,
  ChevronDown,
  Check,
  PlusCircle,
  PauseCircle,
  PlayCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface OrganizationItem {
  id: string;
  name: string;
  service_status: 'active' | 'paused' | 'suspended';
  billing_status: 'paid' | 'unpaid' | 'trial' | 'overdue';
  phone_number?: string | null;
}

export function OrganizationSwitcher() {
  const router = useRouter();
  const { account, accountId, serviceStatus, switchOrganization } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const data = await res.json();
        if (data.organizations) {
          setOrganizations(data.organizations);
        }
      }
    } catch (err) {
      console.warn('Could not load organizations list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadOrganizations();
    }
  }, [open, loadOrganizations]);

  const handleSelect = async (orgId: string, orgName: string) => {
    if (orgId === accountId) {
      setOpen(false);
      return;
    }
    setSwitching(orgId);
    try {
      const ok = await switchOrganization(orgId);
      if (ok) {
        toast.success(`Active workspace switched to "${orgName}"`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error('Failed to switch workspace');
      }
    } catch {
      toast.error('Failed to switch workspace');
    } finally {
      setSwitching(null);
    }
  };

  const filtered = organizations.filter((org) =>
    org.name.toLowerCase().includes(filter.toLowerCase())
  );

  const isCurrentPaused = serviceStatus === 'paused' || serviceStatus === 'suspended';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-card/80 px-3 py-1.5 text-left text-xs font-medium text-foreground shadow-sm transition-all hover:bg-muted/70 hover:border-primary/40 focus:outline-none"
        aria-label="Switch organization"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-3.5 w-3.5" />
        </div>
        <div className="flex flex-col min-w-0 max-w-[140px] sm:max-w-[200px]">
          <span className="truncate font-semibold text-foreground">
            {account?.name || 'My Organization'}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block size-1.5 rounded-full ${
                isCurrentPaused ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {isCurrentPaused ? 'Paused' : 'Active'}
            </span>
          </div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1 opacity-70" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-72 bg-popover text-popover-foreground border-border shadow-2xl p-2 rounded-xl"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Enrolled Organizations
        </DropdownMenuLabel>

        {organizations.length > 3 && (
          <div className="mb-2 px-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted/50 py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
        )}

        <div className="max-h-60 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              {loading ? 'Loading organizations...' : 'No organizations found'}
            </div>
          ) : (
            filtered.map((org) => {
              const isSelected = org.id === accountId;
              const isPaused = org.service_status === 'paused' || org.service_status === 'suspended';
              return (
                <button
                  key={org.id}
                  onClick={() => handleSelect(org.id, org.name)}
                  disabled={switching === org.id}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'hover:bg-muted/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`size-2 shrink-0 rounded-full ${
                        isPaused ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{org.name}</p>
                      {org.phone_number && (
                        <p className="truncate text-[10px] text-muted-foreground">
                          {org.phone_number}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                        isPaused
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {isPaused ? 'Paused' : 'Active'}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="my-1.5 bg-border" />

        <DropdownMenuItem
          onClick={() => {
            setOpen(false);
            router.push('/organizations?enroll=true');
          }}
          className="cursor-pointer text-xs font-semibold text-primary focus:bg-primary/10 focus:text-primary gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Enroll New Organization
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            setOpen(false);
            router.push('/organizations');
          }}
          className="cursor-pointer text-xs text-muted-foreground focus:bg-muted focus:text-foreground gap-2"
        >
          <Building2 className="h-3.5 w-3.5" />
          Manage All Organizations
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
