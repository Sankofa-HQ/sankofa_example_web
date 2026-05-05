import { useState, type FormEvent } from "react";
import { useSankofa } from "../lib/SankofaProvider";

export function ApiKeyGate() {
  const sankofa = useSankofa();
  const [draftKey, setDraftKey] = useState("");
  const [draftEndpoint, setDraftEndpoint] = useState(sankofa.endpoint);
  const [touched, setTouched] = useState(false);

  const inferredEnv: "test" | "live" | null = draftKey.startsWith("sk_test_")
    ? "test"
    : draftKey.startsWith("sk_live_")
      ? "live"
      : null;

  const valid = draftKey.length > 8;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (!valid) return;
    if (draftEndpoint && draftEndpoint !== sankofa.endpoint) {
      sankofa.setEndpoint(draftEndpoint);
    }
    sankofa.setApiKey(draftKey);
  };

  return (
    <div className="gate-shell">
      <div className="gate-card">
        <img
          className="gate-mark"
          src="/sankofa-icon.webp"
          alt="Sankofa"
          width={56}
          height={56}
        />
        <p className="eyebrow">Sankofa Developer Sandbox</p>
        <h1>Connect your project</h1>
        <p className="lede">
          Paste your Sankofa API key to start tracking events, capturing
          errors, and exercising every SDK module from this app. Your key is
          stored locally in this browser only — nothing is sent until the SDK
          boots.
        </p>

        <form onSubmit={handleSubmit} className="gate-form">
          <label htmlFor="gate-api-key">
            API key
            <span className="gate-hint"> · find it in Project settings → API keys</span>
          </label>
          <input
            id="gate-api-key"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            placeholder="sk_test_…"
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
          />
          {inferredEnv && (
            <p className="gate-meta">
              Detected{" "}
              <strong className={`env-tag env-${inferredEnv}`}>
                {inferredEnv.toUpperCase()}
              </strong>{" "}
              environment.
            </p>
          )}
          {touched && !valid && (
            <p className="gate-error">That key looks too short — paste the full token.</p>
          )}

          <details className="gate-details">
            <summary>Advanced · server endpoint</summary>
            <p className="muted small" style={{ marginTop: 6 }}>
              Override only if you self-host. Leave the default for the
              hosted Sankofa cloud.
            </p>
            <input
              spellCheck={false}
              autoComplete="off"
              placeholder="http://localhost:8080"
              value={draftEndpoint}
              onChange={(e) => setDraftEndpoint(e.target.value)}
            />
          </details>

          <button type="submit" disabled={!valid} style={{ marginTop: 14 }}>
            Connect &amp; initialize SDK
          </button>
        </form>

        <div className="gate-footnote">
          <span>Don&apos;t have a key?</span>
          <a
            href="https://sankofa.dev"
            target="_blank"
            rel="noreferrer"
            className="gate-link"
          >
            Get one in 30 seconds ↗
          </a>
        </div>
      </div>
    </div>
  );
}
