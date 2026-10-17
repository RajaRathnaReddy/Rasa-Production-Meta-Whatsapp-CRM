'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: any;
  }
}

interface EmbeddedSignupCardProps {
  isConnected: boolean;
  phoneNumber?: string;
  onSuccess: () => void;
}

const DEFAULT_CONFIG_ID = '1395945589415959';

export function EmbeddedSignupCard({
  isConnected,
  phoneNumber,
  onSuccess,
}: EmbeddedSignupCardProps) {
  const [appId, setAppId] = useState<string>('3466374920204212');
  const [configId, setConfigId] = useState<string>(DEFAULT_CONFIG_ID);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [statusText, setStatusText] = useState<string>('');
  const sessionDataRef = useRef<{ phone_number_id?: string; waba_id?: string }>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Meta App ID & Config ID from backend config endpoint
  useEffect(() => {
    async function loadMetaConfig() {
      try {
        const res = await fetch('/api/whatsapp/embedded-signup/config');
        if (res.ok) {
          const data = await res.json();
          if (data.appId) {
            setAppId(data.appId);
          }
          if (data.configId) {
            setConfigId(data.configId);
          }
        }
      } catch (err) {
        console.warn('Could not load embedded signup config:', err);
      }
    }
    loadMetaConfig();
  }, []);

  // 2. Load Facebook JavaScript SDK once appId is available
  useEffect(() => {
    if (!appId) return;

    if (window.FB) {
      setSdkLoaded(true);
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: 'v21.0',
      });
      setSdkLoaded(true);
    };

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.body.appendChild(script);
    }
  }, [appId]);

  // Clean up any pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // 3. Listen for window messages from Meta's Embedded Signup popup (WA_EMBEDDED_SIGNUP)
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.origin !== 'https://www.facebook.com' &&
        event.origin !== 'https://web.facebook.com'
      ) {
        return;
      }

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.event === 'FINISH' && data.data) {
            sessionDataRef.current = {
              phone_number_id: data.data.phone_number_id,
              waba_id: data.data.waba_id,
            };
          } else if (data.event === 'CANCEL') {
            console.log('Embedded Signup flow cancelled by user');
            handleCancel();
          }
        }
      } catch (e) {
        // Non-JSON message from external extensions, safe to ignore
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCancel = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setConnecting(false);
    setStatusText('');
    sessionDataRef.current = {};
  };

  // 4. Handle exchange of auth code with server
  const handleExchangeCode = useCallback(
    async (code: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatusText('Exchanging authorization with Meta & subscribing webhooks...');
      try {
        const res = await fetch('/api/whatsapp/embedded-signup/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            phone_number_id: sessionDataRef.current.phone_number_id,
            waba_id: sessionDataRef.current.waba_id,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to complete Embedded Signup');
        }

        toast.success(data.message || 'WhatsApp connected successfully via Meta!');
        onSuccess();
      } catch (err: any) {
        console.error('Embedded signup callback error:', err);
        toast.error(err.message || 'Error completing Meta connection');
      } finally {
        handleCancel();
      }
    },
    [onSuccess]
  );

  // 5. Trigger FB.login popup
  const handleStartSignup = () => {
    if (!window.FB) {
      toast.error('Meta SDK is still loading. Please try again in a moment.');
      return;
    }

    setConnecting(true);
    setStatusText('Opening Meta popup...');

    // Auto-timeout after 90 seconds so the button never hangs indefinitely
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setConnecting((prev) => {
        if (prev) {
          toast.info('Meta popup timed out or was closed.');
          return false;
        }
        return false;
      });
      setStatusText('');
    }, 90000);

    const activeConfigId = configId || DEFAULT_CONFIG_ID;

    const loginOptions: any = {
      config_id: activeConfigId,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        feature: 'whatsapp_embedded_signup',
        featureType: 'whatsapp_business_app_onboarding',
        sessionInfoVersion: 3,
        version: 'v4',
      },
    };

    try {
      window.FB.login(function (response: any) {
        if (response?.authResponse?.code) {
          handleExchangeCode(response.authResponse.code);
        } else {
          handleCancel();
          if (response?.status === 'unknown') {
            toast.info('Meta popup was closed.');
          } else {
            console.log('FB.login response:', response);
          }
        }
      }, loginOptions);
    } catch (err: any) {
      console.error('FB.login invocation error:', err);
      handleCancel();
      toast.error('Failed to open Meta popup. Ensure popup blockers are disabled.');
    }
  };

  return (
    <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-background to-background">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <svg className="w-32 h-32 fill-emerald-500" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
        </svg>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-1 px-2.5"
            >
              <Sparkles className="size-3.5" />
              Meta Embedded Signup
            </Badge>
            {isConnected && (
              <Badge
                variant="outline"
                className="bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1 py-1"
              >
                <CheckCircle2 className="size-3" />
                Live on Cloud API
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-400" />
            <span>Config ID: {configId || DEFAULT_CONFIG_ID}</span>
          </div>
        </div>

        <CardTitle className="text-xl font-semibold tracking-tight mt-2 flex items-center gap-2">
          1-Click Connect with Meta
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          Connect your WhatsApp Business Account directly through Meta&apos;s official popup.
          Tokens, phone number IDs, and webhook subscriptions are configured automatically in one step.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="p-3.5 rounded-lg bg-card border border-border/80 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Connected to {phoneNumber || 'WhatsApp Business'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Credentials and webhooks are active. You can re-authorize or switch numbers anytime.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleStartSignup}
                disabled={connecting || !sdkLoaded}
                variant="outline"
                size="sm"
                className="gap-2 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-300"
              >
                {connecting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-3.5" />
                    <span>Re-authorize with Meta</span>
                  </>
                )}
              </Button>

              {connecting && (
                <Button
                  onClick={handleCancel}
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleStartSignup}
              disabled={connecting || !sdkLoaded}
              className="bg-[#0866FF] hover:bg-[#0866FF]/90 text-white font-medium px-5 py-2.5 shadow-sm gap-2 transition-all hover:shadow-md"
            >
              {connecting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{statusText || 'Connecting with Meta...'}</span>
                </>
              ) : (
                <>
                  <svg className="size-4 fill-white" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Connect with Facebook</span>
                </>
              )}
            </Button>

            {connecting && (
              <Button
                onClick={handleCancel}
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
                Cancel
              </Button>
            )}

            {!sdkLoaded && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" />
                Initializing Meta SDK...
              </span>
            )}
          </div>
        )}

        {connecting && (
          <div className="p-2.5 rounded border border-amber-500/20 bg-amber-500/10 text-amber-200 text-xs flex items-center gap-2 animate-in fade-in-50">
            <AlertCircle className="size-4 shrink-0 text-amber-400" />
            <span>
              If the Meta popup window did not open, look at your browser address bar and click <strong>Allow pop-ups</strong>.
            </span>
          </div>
        )}

        <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
          <span>Need custom setup? You can still use the manual configuration below.</span>
        </div>
      </CardContent>
    </Card>
  );
}
