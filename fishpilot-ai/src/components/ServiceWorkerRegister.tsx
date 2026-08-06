"use client";

import { useEffect } from "react";

/** Registra il Service Worker (solo in produzione) per l'app shell offline. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Nessuna azione: l'app funziona comunque online senza offline-caching.
    });
  }, []);

  return null;
}
