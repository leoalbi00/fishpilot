# FishPilot AI (MVP)

Assistente intelligente per pescatori: inserisci partenza, destinazione,
tecnica di pesca e data/ora, e ottieni un **Fishing Score (0-100)**, le
**specie probabili** e **consigli pratici** (velocità traina, profondità,
artificiali, fascia oraria), calcolati incrociando meteo, mare e stagione.

Nessun servizio a pagamento: meteo/mare e geocoding sono forniti da
**Open-Meteo** (gratuito, senza API key), le mappe da **MapLibre GL JS +
OpenFreeMap/OpenStreetMap** (gratuite, senza API key). L'unico servizio da
configurare è **Supabase** (piano gratuito).

---

## 1. Stack tecnico

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth, piano free)
- MapLibre GL JS + tile OpenFreeMap (OpenStreetMap)
- Open-Meteo: Geocoding API, Marine Weather API, Forecast API

## 2. Struttura del progetto

```
fishpilot-ai/
├── supabase/
│   └── schema.sql              # tabelle users, trips, fishing_reports + RLS
├── src/
│   ├── app/
│   │   ├── layout.tsx           # layout root + font
│   │   ├── globals.css          # design tokens Tailwind v4 + texture
│   │   ├── page.tsx             # Home page (form viaggio)
│   │   ├── api/analyze/route.ts # geocoding + meteo + algoritmo + salvataggio
│   │   ├── dashboard/[id]/page.tsx  # Dashboard risultato
│   │   └── map/[id]/page.tsx        # Mappa rotta + zone colorate
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── TripForm.tsx
│   │   ├── ScoreGauge.tsx
│   │   ├── SpeciesList.tsx
│   │   ├── RecommendationsCard.tsx
│   │   ├── ConditionsCard.tsx
│   │   └── FishingMap.tsx
│   ├── lib/
│   │   ├── fishingAlgorithm.ts   # ⭐ algoritmo a punteggio (no ML)
│   │   ├── species.ts            # database specie (temp/stagione/tecnica)
│   │   ├── geocode.ts            # Open-Meteo Geocoding API
│   │   ├── weather.ts            # Open-Meteo Marine + Forecast API
│   │   ├── tripAnalysis.ts       # orchestratore: geocoding+meteo+algoritmo
│   │   ├── utils.ts              # stagione, alba/tramonto, colori score
│   │   └── supabase/
│   │       ├── client.ts         # client Supabase (browser)
│   │       └── server.ts         # client Supabase (server, cookie-aware)
│   └── types/fishing.ts          # tipi condivisi
└── .env.local.example
```

## 3. Installazione

Requisiti: Node.js 20+ e un account Supabase gratuito ([supabase.com](https://supabase.com)).

```bash
# 1. Estrai/apri la cartella del progetto, poi:
npm install
```

## 4. Configurazione Supabase

1. Crea un nuovo progetto su [supabase.com/dashboard](https://supabase.com/dashboard) (piano Free).
2. Vai su **SQL Editor > New query**, incolla il contenuto di `supabase/schema.sql` ed esegui (RUN).
   Questo crea le tabelle `users`, `trips`, `fishing_reports` con le relative
   Row Level Security policy (aperte, pensate per l'uso anonimo dell'MVP).
3. Vai su **Project Settings > API** e copia:
   - `Project URL`
   - `anon public` key (a volte mostrata come "publishable key")
4. Copia `.env.local.example` in `.env.local` e incolla i due valori:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Non serve nessun'altra chiave: Open-Meteo e OpenFreeMap non richiedono API key.

## 5. Avvio in locale

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

Flusso di utilizzo:
1. **Home** → compila partenza, destinazione, tecnica, data/ora → "Analizza pesca".
2. L'app geocodifica i due punti, campiona meteo/mare in 3 punti lungo la
   rotta (partenza, metà, destinazione), calcola lo score con
   `runFishingAlgorithm()` e salva viaggio + report su Supabase.
3. Vieni reindirizzato a **`/dashboard/[id]`**: punteggio, specie probabili,
   condizioni, consigli.
4. Da lì puoi aprire **`/map/[id]`**: rotta e zone colorate in base al
   Fishing Score.

## 6. Come funziona l'algoritmo (`/src/lib/fishingAlgorithm.ts`)

Nessun machine learning: è un sistema a punteggio esplicito e leggibile.

- Parte da una base neutra di **50 punti**.
- **+ punti** se: temperatura del mare favorevole, vento debole, mare
  calmo/poco mosso, orario in finestra alba/tramonto, stagione "alta"
  (estate/autunno per la pesca in mare aperto).
- **- punti** se: mare mosso/molto mosso/agitato, vento forte/molto forte,
  temperatura fuori range, orario di pieno mezzogiorno.
- Il punteggio finale è "clampato" tra 0 e 100.
- Le **specie probabili** sono filtrate dal database in `species.ts` in base
  a tecnica compatibile, range di temperatura e stagionalità, poi ordinate
  per probabilità.
- I **consigli** (velocità traina, profondità, artificiali, fascia oraria)
  sono derivati dalla tecnica scelta e dalle specie in cima alla classifica.

Input/Output della funzione principale:

```ts
runFishingAlgorithm({ weather, seaTemperature, wind, season, time, technique })
// -> { score, species[], recommendations, conditions }
```

Per aggiungere una specie basta aggiungere una riga in `species.ts`; per
cambiare le soglie di punteggio, modifica le funzioni `score*()` in
`fishingAlgorithm.ts`. L'algoritmo non ha altre dipendenze esterne: è
facilmente testabile in isolamento.

## 7. Semplificazioni note dell'MVP (e possibili evoluzioni)

- **Rotta in linea retta**: non usiamo un'API di navigazione marina reale
  (a pagamento) per il percorso; la mappa collega i punti campionati con una
  linea diretta. Evoluzione: integrare un routing marittimo dedicato.
- **3 punti campionati** (partenza, metà, destinazione) invece di un
  campionamento fitto lungo tutta la rotta, per contenere le chiamate API.
- **Uso anonimo**: le tabelle sono pronte per l'autenticazione (`users`,
  `trips.user_id`), ma la v1 non include pagine di login — i viaggi vengono
  salvati con `user_id = null`. Le policy RLS sono aperte ("MVP"): vanno
  ristrette prima di un lancio pubblico con account reali.
- **Finestra dati**: Open-Meteo copre bene date recenti/entro ~16 giorni;
  per date molto lontane nel passato servirebbe l'Archive API dedicata.
- **Prossimi passi suggeriti**: autenticazione utenti, storico viaggi per
  utente, confronto tra più tecniche sullo stesso viaggio, PWA/offline,
  affinamento pesi dell'algoritmo con dati reali di pescato.

## 8. Deploy

Il progetto è pronto per un deploy standard Next.js (es. Vercel, piano
gratuito): imposta le stesse variabili d'ambiente (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`) nel pannello del provider scelto.
