# Plant Monitoring UI

Simple frontend scaffold using Vite.

## Supabase
This UI fetches the latest measurement from Supabase and renders it.

1) Create `UI/.env` (you can copy `UI/.env.example`).

Required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional (defaults):
- `VITE_SUPABASE_TABLE=measurements`
- `VITE_SUPABASE_TIMESTAMP_COLUMN=created_at`
- `VITE_SUPABASE_TEMP_COLUMN=temperature`
- `VITE_SUPABASE_HUMIDITY_COLUMN=humidity`
- `VITE_SUPABASE_SOIL_COLUMN=soil_moisture`

All Supabase/data-processing code lives in `UI/src/Data/`.

## Prereqs
- Node.js 18+ recommended

## Develop
```bash
cd UI
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Build
```bash
cd UI
npm run build
npm run preview
```
