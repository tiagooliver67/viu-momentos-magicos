import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    ttq?: any;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    __viufoto_pixels_loaded?: Record<string, boolean>;
  }
}

type Pixel = { id: string; provider: string; pixel_id: string; active: boolean };

const SESSION_KEY = "viufoto_mkt_session";
const VISITOR_KEY = "viufoto_mkt_visitor";

const getId = (key: string, storage: Storage) => {
  let v = storage.getItem(key);
  if (!v) {
    v = crypto.randomUUID();
    storage.setItem(key, v);
  }
  return v;
};

const loadedRef: Record<string, boolean> = {};

function loadMeta(pixelId: string) {
  if (loadedRef[`meta:${pixelId}`]) return;
  loadedRef[`meta:${pixelId}`] = true;
  /* eslint-disable */
  // @ts-ignore
  !function(f: any,b: any,e: any,v: any,n?: any,t?: any,s?: any){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq?.("init", pixelId);
  window.fbq?.("track", "PageView");
}

function loadGTM(containerId: string) {
  if (loadedRef[`gtm:${containerId}`]) return;
  loadedRef[`gtm:${containerId}`] = true;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
  document.head.appendChild(s);
}

function loadGoogleAds(conversionId: string) {
  if (loadedRef[`gads:${conversionId}`]) return;
  loadedRef[`gads:${conversionId}`] = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  // @ts-ignore
  window.gtag = function () { window.dataLayer!.push(arguments); };
  window.gtag?.("js", new Date());
  window.gtag?.("config", conversionId);
}

function loadTikTok(pixelId: string) {
  if (loadedRef[`ttk:${pixelId}`]) return;
  loadedRef[`ttk:${pixelId}`] = true;
  /* eslint-disable */
  // @ts-ignore
  !function(w: any,d: any,t: any){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t: any,e: any){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t: any){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e: any,n: any){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load(pixelId);ttq.page();}(window,document,'ttq');
  /* eslint-enable */
}

function fireEvent(name: string, params: Record<string, any>) {
  try {
    window.fbq?.("track", name, params);
    window.ttq?.track(name, params);
    window.dataLayer?.push({ event: name, ...params });
  } catch { /* noop */ }
}

/**
 * Loads the photographer's pixels for the given photographerId and provides
 * a `track` function that fires client-side pixels + logs to Supabase.
 */
export function useMarketingTracker(photographerId?: string | null, eventId?: string | null) {
  const readyRef = useRef(false);

  useEffect(() => {
    if (!photographerId || readyRef.current) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("marketing_pixels" as any)
        .select("id, provider, pixel_id, active")
        .eq("user_id", photographerId)
        .eq("active", true);

      if (cancelled) return;
      const pixels = ((data || []) as unknown) as Pixel[];

      for (const p of pixels) {
        if (p.provider === "meta") loadMeta(p.pixel_id);
        else if (p.provider === "gtm") loadGTM(p.pixel_id);
        else if (p.provider === "google_ads") loadGoogleAds(p.pixel_id);
        else if (p.provider === "tiktok") loadTikTok(p.pixel_id);
      }

      readyRef.current = true;

      // Log PageView server-side
      logEvent("PageView", {});
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photographerId]);

  const logEvent = (name: string, payload: Record<string, any> = {}) => {
    if (!photographerId) return;
    fireEvent(name, payload);
    const session_id = getId(SESSION_KEY, sessionStorage);
    const visitor_id = getId(VISITOR_KEY, localStorage);
    supabase.from("marketing_events_log" as any).insert({
      photographer_id: photographerId,
      event_id: eventId || null,
      session_id,
      visitor_id,
      event_name: name,
      payload,
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
    }).then(() => {});
  };

  return { track: logEvent };
}