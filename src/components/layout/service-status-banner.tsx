'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { PauseCircle, PlayCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function ServiceStatusBanner() {
  const { account, accountId, serviceStatus, isServicesPaused, isOwner, isAdmin, refreshProfile } = useAuth();
  const [resuming, setResuming] = useState(false);

  if (!isServicesPaused) return null;

  const handleResume = async () => {
    if (!accountId) return;
    setResuming(true);
    try {
      const res = await fetch(`/api/organizations/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceStatus: 'active' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to resume services');
      }
      toast.success('Services resumed successfully! Outbound messaging is re-enabled.');
      await refreshProfile();
    } catch (err: any) {
      toast.error(err?.message || 'Could not resume services');
    } finally {
      setResuming(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-red-500/10 to-amber-500/15 p-4 shadow-lg backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
            <PauseCircle className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-300 uppercase tracking-wider text-xs">
                Services Paused
              </span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                {account?.name || 'Organization'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-amber-100/80 leading-relaxed">
              WhatsApp messaging and automations for this organization are currently <strong>stopped/paused</strong> due to billing hold or administrator restriction. Inbound messages may be held.
            </p>
          </div>
        </div>

        {(isOwner || isAdmin) && (
          <Button
            size="sm"
            onClick={handleResume}
            disabled={resuming}
            className="shrink-0 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-lg transition-all shadow-md active:scale-95"
          >
            {resuming ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Resuming...
              </>
            ) : (
              <>
                <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                Resume Services
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
