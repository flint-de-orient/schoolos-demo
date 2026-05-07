'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, RefreshCw } from 'lucide-react';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FB: any;
    fbAsyncInit: () => void;
  }
}

interface Props {
  connected:     boolean;
  wabaId?:       string;
  phoneNumberId?: string;
  businessName?: string;
  onConnected:   () => void;
}

export default function WhatsAppConnect({ connected, wabaId, phoneNumberId, businessName, onConnected }: Props) {
  const [loading,  setLoading]  = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  const saveConnection = useCallback(async (pid: string, wid: string) => {
    try {
      const res = await fetch('/api/settings/whatsapp/connect', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phoneNumberId: pid, wabaId: wid }),
      });
      if (!res.ok) throw new Error();
      toast.success('WhatsApp Business connected successfully!');
      onConnected();
    } catch {
      toast.error('Failed to save WhatsApp connection. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onConnected]);

  useEffect(() => {
    // Message listener for Embedded Signup session info
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com') return;
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.event === 'FINISH') {
            const { phone_number_id, waba_id } = data.data as { phone_number_id: string; waba_id: string };
            saveConnection(phone_number_id, waba_id);
          } else if (data.event === 'CANCEL') {
            toast.info('WhatsApp setup cancelled.');
            setLoading(false);
          } else if (data.event === 'ERROR') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            toast.error('WhatsApp error: ' + ((data.data as any)?.error_message ?? 'Unknown error'));
            setLoading(false);
          }
        }
      } catch { /* non-JSON messages */ }
    };

    window.addEventListener('message', handleMessage);

    // Load Facebook JS SDK
    if (!document.getElementById('facebook-jssdk')) {
      window.fbAsyncInit = () => {
        window.FB.init({
          appId:            process.env.NEXT_PUBLIC_META_APP_ID,
          autoLogAppEvents: true,
          xfbml:            true,
          version:          'v21.0',
        });
        setSdkReady(true);
      };
      const script    = document.createElement('script');
      script.id       = 'facebook-jssdk';
      script.src      = 'https://connect.facebook.net/en_US/sdk.js';
      script.async    = true;
      script.defer    = true;
      document.head.appendChild(script);
    } else if (window.FB) {
      setSdkReady(true);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [saveConnection]);

  const handleConnect = () => {
    if (!sdkReady || !window.FB) {
      toast.error('Facebook SDK not ready. Please refresh and try again.');
      return;
    }
    setLoading(true);
    window.FB.login(
      (response: { authResponse?: unknown }) => {
        // Success is handled via the 'message' event listener above.
        // If user closes the popup without completing, authResponse is null.
        if (!response.authResponse) {
          setLoading(false);
        }
      },
      {
        config_id:                       process.env.NEXT_PUBLIC_META_CONFIG_ID,
        response_type:                   'code',
        override_default_response_type:  true,
        extras: { sessionInfoVersion: 3 },
      }
    );
  };

  if (connected && wabaId) {
    return (
      <div className="space-y-3">
        <div className="bg-green/5 border border-green/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green" />
            <span className="text-sm font-semibold text-green">WhatsApp Business Connected</span>
          </div>
          {businessName && <p className="text-xs text-gray-600 font-semibold mb-1">{businessName}</p>}
          <p className="text-xs text-gray-500">WABA ID: <span className="font-mono text-gray-700">{wabaId}</span></p>
          {phoneNumberId && (
            <p className="text-xs text-gray-500 mt-0.5">Phone Number ID: <span className="font-mono text-gray-700">{phoneNumberId}</span></p>
          )}
        </div>
        <button
          onClick={handleConnect}
          disabled={loading || !sdkReady}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-navy transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Reconnect with a different account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-900 mb-1">Connect your school&apos;s WhatsApp Business Account</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          Click below to securely connect via Meta&apos;s Embedded Signup. You&apos;ll need a Facebook account
          with admin access to the school&apos;s WhatsApp Business Account.
        </p>
      </div>
      <button
        onClick={handleConnect}
        disabled={loading || !sdkReady}
        className="flex items-center gap-2.5 px-5 py-2.5 bg-[#1877F2] text-white font-semibold text-sm rounded-xl hover:bg-[#1464D8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Connect with WhatsApp
          </>
        )}
      </button>
      {!sdkReady && (
        <p className="text-xs text-gray-400">Loading Facebook SDK...</p>
      )}
    </div>
  );
}
