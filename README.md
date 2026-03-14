# Sankofa Web Example

Minimal React + Vite example for the browser SDK and rrweb replay plugin.

## Run

1. `cp .env.example .env`
2. `npm install`
3. `npm run dev`

Use the engine base URL for `VITE_SANKOFA_ENDPOINT`, for example `http://localhost:8080`.

If you are serving the example from Vite on `http://localhost:5173`, add that origin to
`CORS_ALLOWED_ORIGINS` on the engine or the browser will block event uploads.

If you use an API key with the `sk_test_` prefix, Sankofa writes the data to the `test`
environment. Switch the dashboard environment to `test` or the Events page will look empty.

Replay uploads require the enterprise engine build plus the replay storage variables
(`B2_ENDPOINT`, `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET_NAME`) because replay ingest lives
under `/api/replay/chunk`.

## Build

`npm run build`
