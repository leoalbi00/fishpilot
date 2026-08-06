// ============================================================
// /lib/weatherIcons.ts — Icone/etichette cielo da WMO Weather Code
//
// Open-Meteo restituisce il codice meteo WMO standard (0-99) per ogni ora
// (parametro "weather_code" nella Forecast API). Nessuna chiamata
// aggiuntiva: il codice arriva già nella stessa risposta usata per
// vento/nuvolosità/temperatura (vedi lib/weather.ts).
// Tabella ufficiale: https://open-meteo.com/en/docs (sezione WMO Weather
// interpretation codes).
// ============================================================

export interface WeatherIconInfo {
  icon: string;
  label: string;
}

/** Mappa il codice WMO alla condizione del cielo più vicina tra le quattro
 * categorie principali (Sole, Nubi, Pioggia, Nebbia), con temporale/neve
 * distinti quando rilevante. */
export function weatherCodeInfo(code: number): WeatherIconInfo {
  if (code === 0) return { icon: "☀️", label: "Sereno" };
  if (code === 1 || code === 2) return { icon: "🌤️", label: "Poco nuvoloso" };
  if (code === 3) return { icon: "☁️", label: "Nuvoloso" };
  if (code === 45 || code === 48) return { icon: "🌫️", label: "Nebbia" };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: "🌦️", label: "Pioviggine" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: "🌧️", label: "Pioggia" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: "🌨️", label: "Neve" };
  if ([95, 96, 99].includes(code)) return { icon: "⛈️", label: "Temporale" };
  return { icon: "🌡️", label: "N/D" };
}
