import { useEffect, useRef } from 'react';
import { usePushNotifications } from './usePushNotifications';
import { useAuth } from './useAuth';

/**
 * Auto-prompts for push notification permission once per user session.
 * Place this hook in a component that renders after login (e.g., layout).
 */
export function usePushPrompt() {
  const { user } = useAuth();
  const { isSupported, permission, isSubscribed, subscribe } = usePushNotifications();
  const prompted = useRef(false);

  useEffect(() => {
    if (!user || !isSupported || prompted.current || isSubscribed) return;
    if (permission === 'denied') return; // User already blocked

    // Only prompt once per session
    prompted.current = true;

    // Small delay so UI is ready
    const timer = setTimeout(() => {
      if (permission === 'default') {
        subscribe();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [user, isSupported, permission, isSubscribed, subscribe]);
}
