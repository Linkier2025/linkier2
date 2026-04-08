import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSupported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

  // Check current subscription status
  useEffect(() => {
    if (!isSupported || !user) return;
    
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    }).catch(() => {});
  }, [user, isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user) return false;
    setLoading(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setLoading(false);
        return false;
      }

      // Get VAPID public key from edge function
      const { data: keyData } = await supabase.functions.invoke('send-push', {
        method: 'GET',
      });

      if (!keyData?.vapidPublicKey) {
        console.error('Failed to get VAPID key');
        setLoading(false);
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      
      // Convert VAPID key to Uint8Array
      const vapidKey = urlBase64ToUint8Array(keyData.vapidPublicKey);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      const subJson = subscription.toJSON();

      // Save to database
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (error) {
        console.error('Failed to save subscription:', error);
        setLoading(false);
        return false;
      }

      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Push subscription error:', err);
      setLoading(false);
      return false;
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) return;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', endpoint);
      }

      setIsSubscribed(false);
    } catch (err) {
      console.error('Unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isSupported]);

  return { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
