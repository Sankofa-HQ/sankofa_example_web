import { useEffect, useState } from "react";
import {
  Sankofa,
  type SankofaClientSnapshot,
  resolveBatchUrl,
  resolveReplayChunkUrl,
} from "@sankofa/browser";
import { rrwebReplayPlugin as sessionReplayPlugin } from "@sankofa/replay-rrweb";

export default function App() {
  const apiKey = import.meta.env.VITE_SANKOFA_API_KEY?.trim() ?? "";
  const endpoint = import.meta.env.VITE_SANKOFA_ENDPOINT ?? "http://localhost:8080";
  const replayEnabled = import.meta.env.VITE_SANKOFA_ENABLE_REPLAY !== "false";
  const ingestEnvironment = apiKey.startsWith("sk_test_") ? "test" : "live";
  const sdkEnabled = apiKey.length > 0;
  
  const [snapshot, setSnapshot] = useState<SankofaClientSnapshot | null>(null);
  const [userId, setUserId] = useState("demo-user@example.com");
  const [company, setCompany] = useState("Sankofa Labs");
  const [status, setStatus] = useState("Waiting for SDK initialization.");
  const [ready, setReady] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!sdkEnabled) {
      setReady(false);
      setSnapshot(null);
      setStatus("Set VITE_SANKOFA_API_KEY in .env to initialize the SDK.");
      setError(null);
      return;
    }

    const initialize = async () => {
      try {
        setInitializing(true);
        setReady(false);
        setError(null);
        setStatus("Initializing Sankofa...");

        await Sankofa.init({
          apiKey,
          endpoint,
          debug: true,
          flushIntervalMs: 2_000,
          plugins: replayEnabled ? [sessionReplayPlugin()] : [],
        });

        await Sankofa.flush({
          reason: "manual",
        });

        if (cancelled) {
          return;
        }

        setSnapshot(Sankofa.getSnapshot());
        setReady(true);
        setStatus(
          replayEnabled
            ? "SDK Ready. Live session recording is active. Pageview sent automatically."
            : "SDK Ready. Live tracking active (Session recording disabled).",
        );
      } catch (initError) {
        if (cancelled) return;

        const message = formatError(initError);
        setReady(false);
        setSnapshot(null);
        setError(message);
        setStatus(`Initialization Failed: ${message}`);
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      void Sankofa.shutdown();
    };
  }, [apiKey, endpoint, replayEnabled, retryToken, sdkEnabled]);

  const refreshSnapshot = () => {
    if (ready) {
      setSnapshot(Sankofa.getSnapshot());
    }
  };

  const runAction = async (label: string, action: () => Promise<void>) => {
    try {
      setError(null);
      setStatus(`${label} in progress...`);
      await action();
      await Sankofa.flush({
        reason: "manual",
      });
      refreshSnapshot();
      setStatus(`✅ ${label} completed successfully.`);
    } catch (actionError) {
      const message = formatError(actionError);
      setError(message);
      setStatus(`❌ ${label} Failed: ${message}`);
    }
  };

  const handleTrack = async () => {
    await runAction("Track custom event", async () => {
      await Sankofa.track("premium_feature_clicked", {
        area: "hero_section",
        feature_name: "analytics_dashboard",
        revenue_potential: 149,
      });
    });
  };

  const handleIdentify = async () => {
    await runAction("Identify user", async () => {
      await Sankofa.identify(userId);
      await Sankofa.setPerson({
        email: userId,
        company: company,
        plan: "enterprise"
      });
    });
  };

  const handlePeopleSet = async () => {
    await runAction("Update profile traits", async () => {
      await Sankofa.setPerson({
        company,
        lifecycle_stage: "power_user",
        seats_active: 12,
      });
    });
  };

  const handleReset = async () => {
    await runAction("Reset identity", async () => {
      await Sankofa.reset();
    });
  };

  const handleFlush = async () => {
    await runAction("Force flush queue", async () => {
      await Sankofa.flush({
        reason: "manual",
        keepalive: true,
      });
    });
  };

  return (
    <main className="shell">
      <section className="panel hero">
        <p className="eyebrow">Sankofa Developer SDK</p>
        <h1>Next-Gen Product Analytics</h1>
        <p className="lede">
          Welcome to the Sankofa interactive sandbox. Test the core browser SDK capabilities in real-time.
          Experience seamless event tracking, identity resolution, and high-fidelity session replays.
        </p>
        
        <div className="status-indicator flex items-center gap-2">
          {ready ? "🟢" : error ? "🔴" : "🟡"} {status}
        </div>

        <div className="config-grid">
          <p>
            <strong>Core Endpoint</strong>
            <code>{endpoint}</code>
          </p>
          <p>
            <strong>Analytics Pipeline</strong>
            <code>{resolveBatchUrl(endpoint).toString()}</code>
          </p>
          <p>
            <strong>Session Replay Service</strong>
            <code>{resolveReplayChunkUrl(endpoint).toString()}</code>
          </p>
          <p>
            <strong>Replay Status</strong>
            <span style={{ color: replayEnabled ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
              {replayEnabled ? "Active & Recording" : "Disabled"}
            </span>
          </p>
          <p>
            <strong>Ingest Environment</strong>
            <span style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{ingestEnvironment}</span>
          </p>
        </div>

        {!sdkEnabled && (
          <p className="lede" style={{ color: '#fca5a5' }}>
            ⚠️ Environment missing: Set <code>VITE_SANKOFA_API_KEY</code> in <code>.env.local</code> to awake the SDK.
          </p>
        )}
        
        {ingestEnvironment === "test" && sdkEnabled && (
          <p className="status" style={{ color: '#fbbf24', marginTop: 12 }}>
            You are using a <strong>TEST</strong> environment key. Toggle to "Test Data" in your Sankofa dashboard to view these events.
          </p>
        )}

        <div className="actions">
          <button disabled={!ready} onClick={handleTrack}>
            Simulate User Action
          </button>
          <button className="secondary" disabled={!ready} onClick={handleFlush}>
            Force Sync
          </button>
          <button
            className="ghost"
            disabled={!sdkEnabled || initializing}
            onClick={() => setRetryToken((value) => value + 1)}
          >
            {initializing ? "Mounting..." : "Remount SDK"}
          </button>
        </div>
      </section>

      <section className="panel">
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem' }}>Identity Management</h2>
          <p className="lede" style={{ fontSize: '0.95rem', marginBottom: 0 }}>
            Merge anonymous behavioral data with known customer records dynamically.
          </p>
        </div>
        
        <div className="grid">
          <div>
            <label htmlFor="user-id">Customer Target ID</label>
            <input
              id="user-id"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="e.g. user-123"
            />
          </div>
          <div>
            <label htmlFor="company">Organization Name</label>
            <input
              id="company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="e.g. Sankofa Labs"
            />
          </div>
        </div>
        
        <div className="actions">
          <button disabled={!ready} onClick={handleIdentify}>
            Identify Customer
          </button>
          <button className="secondary" disabled={!ready} onClick={handlePeopleSet}>
            Update Traits
          </button>
          <button className="ghost" disabled={!ready} onClick={handleReset}>
            Anonymize Session
          </button>
        </div>
      </section>

      <section className="panel snapshot">
        <div className="snapshot-header">
          <h2>Runtime Diagnostic Snapshot</h2>
          <button className="secondary" disabled={!ready} onClick={refreshSnapshot} style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
            Refresh State
          </button>
        </div>
        <pre>{JSON.stringify(snapshot, null, 2)}</pre>
      </section>
    </main>
  );
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
