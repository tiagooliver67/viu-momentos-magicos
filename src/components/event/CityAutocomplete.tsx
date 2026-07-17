import { useEffect, useRef, useState } from "react";
import { MapPin, Check, Loader2 } from "lucide-react";

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

declare global {
  interface Window {
    google?: any;
    __gmapsReady?: Promise<void>;
    __gmapsInit?: () => void;
  }
}

function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.__gmapsReady) return window.__gmapsReady;
  if (!BROWSER_KEY) return Promise.reject(new Error("Google Maps key missing"));

  window.__gmapsReady = new Promise<void>((resolve) => {
    window.__gmapsInit = () => resolve();
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key: BROWSER_KEY,
      libraries: "places,marker",
      loading: "async",
      callback: "__gmapsInit",
      language: "pt-BR",
      region: "BR",
    });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  });
  return window.__gmapsReady;
}

export interface CityValue {
  label: string;      // "São Paulo - SP"
  placeId: string;
  lat: number;
  lng: number;
}

interface Props {
  value: string;
  confirmed: CityValue | null;
  onChange: (text: string) => void;
  onSelect: (v: CityValue) => void;
  onClear: () => void;
  error?: string;
}

export default function CityAutocomplete({ value, confirmed, onChange, onSelect, onClear, error }: Props) {
  const [ready, setReady] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const markerObj = useRef<any>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    loadMaps().then(() => setReady(true)).catch(() => setReady(false));
  }, []);

  // debounce search
  useEffect(() => {
    if (!ready || confirmed) { setSuggestions([]); return; }
    if (!value || value.trim().length < 2) { setSuggestions([]); return; }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        setLoading(true);
        const { AutocompleteSuggestion, AutocompleteSessionToken } =
          (await window.google.maps.importLibrary("places")) as any;
        if (!sessionRef.current) sessionRef.current = new AutocompleteSessionToken();
        const { suggestions: res } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value,
          sessionToken: sessionRef.current,
          includedPrimaryTypes: ["(cities)"],
          includedRegionCodes: ["br"],
          language: "pt-BR",
        });
        setSuggestions(res || []);
      } catch (e) {
        console.warn("places autocomplete error", e);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [value, ready, confirmed]);

  // map
  useEffect(() => {
    if (!confirmed || !ready || !mapRef.current) return;
    (async () => {
      const { Map } = (await window.google.maps.importLibrary("maps")) as any;
      const pos = { lat: confirmed.lat, lng: confirmed.lng };
      if (!mapObj.current) {
        mapObj.current = new Map(mapRef.current!, {
          center: pos, zoom: 11, disableDefaultUI: true, gestureHandling: "cooperative",
        });
      } else {
        mapObj.current.setCenter(pos);
      }
      if (markerObj.current) markerObj.current.setMap(null);
      markerObj.current = new window.google.maps.Marker({ position: pos, map: mapObj.current });
    })();
  }, [confirmed, ready]);

  const handlePick = async (s: any) => {
    try {
      const pred = s.placePrediction;
      const place = pred.toPlace();
      await place.fetchFields({ fields: ["location", "displayName", "formattedAddress"] });
      const loc = place.location;
      const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
      const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
      const label = pred.text?.text || place.formattedAddress || place.displayName || "";
      onSelect({ label, placeId: pred.placeId, lat, lng });
      setOpen(false);
      setSuggestions([]);
      sessionRef.current = null; // encerra sessão de billing
    } catch (e) {
      console.warn("place details error", e);
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-foreground mb-1.5">Local do evento *</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={ready ? "Digite a cidade do evento" : "Carregando busca..."}
          value={confirmed ? confirmed.label : value}
          onChange={(e) => {
            if (confirmed) onClear();
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          disabled={!ready}
          className={`w-full pl-10 pr-10 py-3 rounded-lg bg-secondary border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors text-sm min-h-[48px] ${error ? "border-red-500" : confirmed ? "border-emerald-500" : "border-border"}`}
        />
        {confirmed && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
        )}
        {loading && !confirmed && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {open && !confirmed && suggestions.length > 0 && (
        <div className="absolute z-20 w-full mt-1 rounded-lg bg-secondary border border-border shadow-xl overflow-hidden">
          {suggestions.slice(0, 6).map((s, i) => {
            const pred = s.placePrediction;
            const main = pred?.mainText?.text || pred?.text?.text || "";
            const secondary = pred?.secondaryText?.text || "";
            return (
              <button
                key={pred?.placeId || i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handlePick(s); }}
                className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-primary/10 transition-colors flex items-center gap-2"
              >
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="flex-1">
                  <span className="font-medium">{main}</span>
                  {secondary && <span className="text-muted-foreground"> · {secondary}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!confirmed && !error && value.length >= 2 && !loading && suggestions.length === 0 && ready && (
        <p className="text-xs text-muted-foreground mt-1">Nenhuma cidade encontrada. Continue digitando…</p>
      )}
      {!confirmed && !error && (
        <p className="text-xs text-muted-foreground mt-1">Selecione uma cidade da lista para continuar.</p>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      {confirmed && (
        <div
          ref={mapRef}
          className="mt-3 w-full h-40 rounded-lg overflow-hidden border border-border bg-secondary"
          aria-label={`Mapa: ${confirmed.label}`}
        />
      )}
    </div>
  );
}
