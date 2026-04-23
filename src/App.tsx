import { useEffect, useState } from "react";
import {
  Sankofa,
  type SankofaClientSnapshot,
  resolveBatchUrl,
  resolveReplayChunkUrl,
} from "@sankofa/browser";
import { rrwebReplayPlugin as sessionReplayPlugin } from "@sankofa/replay-rrweb";
import { switchPlugin, getSwitch } from "@sankofa/switch";
import { configPlugin, getConfig } from "@sankofa/config";
import { catchPlugin, getCatch } from "@sankofa/catch";
import { FlagsLabPanel } from "./FlagsLabPanel";
import { CatchCrashGallery } from "./CatchCrashGallery";
import { DEMO_FLAG_DEFAULTS, DEMO_CONFIG_DEFAULTS } from "./sankofaDemo";

export default function App() {
  const apiKey = import.meta.env.VITE_SANKOFA_API_KEY?.trim() ?? "sk_test_b25f965d194d55bd071fb23921401e7c";
  const endpoint = import.meta.env.VITE_SANKOFA_ENDPOINT ?? "http://localhost:8080";
  const replayEnabled = import.meta.env.VITE_SANKOFA_ENABLE_REPLAY !== "false";
  const ingestEnvironment = apiKey.startsWith("sk_test_") ? "test" : "live";
  const sdkEnabled = apiKey.length > 0;
  
  const [snapshot, setSnapshot] = useState<SankofaClientSnapshot | null>(null);
  const [userId, setUserId] = useState("demo-user@example.com");
  const [userName, setUserName] = useState("Demo User");
  const [avatarUrl, setAvatarUrl] = useState("https://i.pravatar.cc/150?u=demo");
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

        const plugins = [
          // Switch & Config always ship in this example — they feed the
          // FlagsLabPanel below. Bundled defaults keep the lab
          // renderable before the first handshake completes.
          switchPlugin({ defaults: DEMO_FLAG_DEFAULTS }),
          configPlugin({ defaults: DEMO_CONFIG_DEFAULTS }),
          // Catch wires the flag + config snapshots into every error
          // event so the dashboard can show "these flags were ON when
          // this crashed". Also routes uncaught errors + unhandled
          // rejections to /api/catch/events.
          catchPlugin({
            environment: ingestEnvironment,
            readFlagSnapshot: () => {
              const s = getSwitch();
              if (!s) return undefined;
              const out: Record<string, string> = {};
              for (const k of s.getAllKeys()) {
                const d = s.getDecision(k);
                if (d) out[k] = d.variant ?? String(d.value);
              }
              return Object.keys(out).length ? out : undefined;
            },
            readConfigSnapshot: () => {
              const c = getConfig();
              const all = c?.getAll();
              return all && Object.keys(all).length ? all : undefined;
            },
          }),
        ];
        if (replayEnabled) plugins.push(sessionReplayPlugin() as never);

        await Sankofa.init({
          apiKey,
          endpoint,
          debug: true,
          flushIntervalMs: 2_000,
          plugins,
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
      // 1. First, tell Sankofa who this user is using their internal database ID
      await Sankofa.identify(userId);

      // 2. Then, set their profile properties so the dashboard can display them
      await Sankofa.setPerson({
        name: userName,
        email: userId,
        avatar: avatarUrl,
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

  // ── Catch — smoke test the error-tracking path ──
  // These three buttons exercise the three entry points Catch
  // supports. The events flow to /api/catch/events and appear in the
  // dashboard's Issues list under the fingerprint they group into.
  const handleThrowUncaught = () => {
    // Fired as an uncaught exception so the global handler catches it.
    setTimeout(() => {
      throw new Error(`Uncaught test error @ ${new Date().toISOString()}`);
    }, 0);
  };

  const handleRejectedPromise = () => {
    void Promise.reject(new Error(`Unhandled rejection test @ ${new Date().toISOString()}`));
  };

  const handleCaptureException = async () => {
    await runAction("Capture handled exception", async () => {
      try {
        const payload: { id?: string } = {};
        // Force a runtime error for demo purposes.
        // @ts-expect-error — intentional synthetic error
        payload.id.toUpperCase();
      } catch (e) {
        getCatch()?.captureException(e, {
          tags: { area: "demo" },
          extra: { hint: "the payload had no id field" },
        });
      }
      await getCatch()?.flush();
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
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: "1.5rem" }}>Sankofa Catch — smoke tests</h2>
          <p className="lede" style={{ fontSize: "0.95rem", marginBottom: 0 }}>
            Fire synthetic errors through the three Catch entry points. Each one flows to{" "}
            <code>/api/catch/events</code> as a <code>CatchEvent</code> and surfaces in the
            dashboard's Issues list — grouped by fingerprint, tagged with the live flag + config
            snapshot.
          </p>
        </div>
        <div className="actions">
          <button disabled={!ready} onClick={handleThrowUncaught}>
            Throw uncaught error
          </button>
          <button className="secondary" disabled={!ready} onClick={handleRejectedPromise}>
            Reject promise
          </button>
          <button className="ghost" disabled={!ready} onClick={handleCaptureException}>
            captureException()
          </button>
        </div>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: "1.05rem" }}>Full crash gallery</h3>
          <p className="lede" style={{ fontSize: "0.9rem", marginBottom: 0 }}>
            One button per realistic frontend error class. Click a card to produce a distinct event shape
            in the Issues list — grouped by fingerprint with full breadcrumb trail.
          </p>
        </div>
        <CatchCrashGallery disabled={!ready} />
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
            <label htmlFor="user-name">Customer Name</label>
            <input
              id="user-name"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="e.g. Demo User"
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
          <div>
            <label htmlFor="avatar">Avatar URL</label>
            <input
              id="avatar"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://..."
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

      <FlagsLabPanel
        ready={ready}
        onRefresh={async () => {
          // Refetches the handshake and reroutes new decisions to every
          // plugin. Dashboard edits land in the lab panel within one
          // round-trip.
          if (!ready) return;
          await Sankofa.flush({ reason: "manual" });
          refreshSnapshot();
        }}
      />

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
