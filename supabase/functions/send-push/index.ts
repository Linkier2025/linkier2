import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Web Push utilities using Web Crypto API
async function generateJWT(endpoint: string): Promise<string> {
  const audience = new URL(endpoint).origin
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: audience,
    exp: now + 86400,
    sub: 'mailto:notifications@linkier.app',
  }

  const enc = new TextEncoder()
  const headerB64 = base64url(enc.encode(JSON.stringify(header)))
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)))
  const unsigned = `${headerB64}.${payloadB64}`

  // Import private key
  const keyData = base64urlDecode(VAPID_PRIVATE_KEY)
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(unsigned)
  )

  // Convert DER signature to raw r||s format if needed
  const sigBytes = new Uint8Array(sig)
  let rawSig: Uint8Array
  if (sigBytes.length === 64) {
    rawSig = sigBytes
  } else {
    // Web Crypto returns IEEE P1363 format (64 bytes) on most platforms
    rawSig = sigBytes
  }

  return `${unsigned}.${base64url(rawSig)}`
}

function base64url(buf: Uint8Array): string {
  let str = ''
  for (const b of buf) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (padded.length % 4)) % 4
  const b64 = padded + '='.repeat(pad)
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string
): Promise<boolean> {
  try {
    const jwt = await generateJWT(subscription.endpoint)
    const vapidPublicKeyBytes = base64urlDecode(VAPID_PUBLIC_KEY)

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        TTL: '86400',
        Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
        Urgency: 'high',
      },
      body: new TextEncoder().encode(payload),
    })

    if (!response.ok) {
      console.error(`Push failed: ${response.status} ${await response.text()}`)
      return false
    }
    return true
  } catch (err) {
    console.error('Push send error:', err)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // GET endpoint to return VAPID public key
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ vapidPublicKey: VAPID_PUBLIC_KEY }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { user_id, title, body, url } = await req.json()

    if (!user_id || !title) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id or title' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch user's push subscriptions
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (error) {
      console.error('DB error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = JSON.stringify({
      title,
      body: body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: url || '/notifications' },
    })

    let sent = 0
    const expired: string[] = []

    for (const sub of subscriptions) {
      const success = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      )
      if (success) {
        sent++
      } else {
        expired.push(sub.id)
      }
    }

    // Clean up expired subscriptions
    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expired)
    }

    return new Response(
      JSON.stringify({ sent, expired: expired.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
