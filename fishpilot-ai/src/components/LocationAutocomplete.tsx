"use client";

import { useEffect, useRef, useState } from "react";
import type { LocationSuggestion } from "@/types/fishing";

interface LocationAutocompleteProps {
  value: string;
  onChange: (text: string) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
  placeholder?: string;
  className?: string;
}

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

/** Campo località con autocompletamento in tempo reale (Nominatim, via
 * /api/geocode). Digitando compaiono suggerimenti; selezionandone uno si
 * ottengono anche le coordinate esatte, senza bisogno di ri-geocodificare
 * il testo al submit del form. */
export default function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (requestId !== requestIdRef.current) return; // risposta di una digitazione precedente
        setSuggestions(data.results ?? []);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        if (requestId === requestIdRef.current) setSuggestions([]);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  function handleSelect(s: LocationSuggestion) {
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    // Rimandata di un tick: selezionare una voce fa sì che il genitore
    // smonti questo stesso combobox (sostituendolo con il badge "posizione
    // acquisita"). Farlo nello stesso giro dell'evento click causa, in
    // alcuni browser, un mis-targeting dell'evento nativo generato subito
    // dopo (il click successivo può centrare l'elemento che ha preso il
    // posto di quello appena rimosso). Rimandare la chiamata evita la corsa.
    setTimeout(() => onSelect(s), 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full" onBlur={handleBlur}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
      />

      {loading && (
        <span
          aria-hidden
          className="absolute right-3 top-1/2 -translate-y-1/2 text-foam/40 text-xs font-mono animate-pulse"
        >
          …
        </span>
      )}

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-40 mt-1.5 w-full max-h-64 overflow-y-auto rounded-lg border border-hull/50 bg-depth shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
        >
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
                className={`w-full text-left px-4 py-2.5 min-h-[44px] transition-colors ${
                  i === activeIndex ? "bg-signal/20" : "hover:bg-hull/30"
                }`}
              >
                <span className="block truncate text-sm text-foam">{s.label}</span>
                <span className="block truncate text-xs text-foam/45">{s.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
