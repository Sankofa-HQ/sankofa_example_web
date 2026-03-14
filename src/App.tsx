import { useEffect, useState } from "react";
import {
  Sankofa,
  type SankofaClientSnapshot,
  resolveBatchUrl,
  resolveReplayChunkUrl,
} from "@sankofa/browser";
import { rrwebReplayPlugin } from "@sankofa/replay-rrweb";

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
          plugins: replayEnabled ? [rrwebReplayPlugin()] : [],
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
            ? "SDK ready. Pageview sent. Replay recording is enabled if the backend supports /api/replay/chunk."
            : "SDK ready. Pageview sent.",
        );
      } catch (initError) {
        if (cancelled) {
          return;
        }

        const message = formatError(initError);
        setReady(false);
        setSnapshot(null);
        setError(message);
        setStatus(`Initialization failed: ${message}`);
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
      setStatus(`${label}...`);
      await action();
      await Sankofa.flush({
        reason: "manual",
      });
      refreshSnapshot();
      setStatus(`${label} complete. Check the dashboard and browser console for upload details.`);
    } catch (actionError) {
      const message = formatError(actionError);
      setError(message);
      setStatus(`${label} failed: ${message}`);
    }
  };

  const handleTrack = async () => {
    await runAction("Track CTA click", async () => {
      await Sankofa.track("web_example_button_clicked", {
        area: "hero",
        variant: "primary",
        revenue: 149,
      });
    });
  };

  const handleIdentify = async () => {
    await runAction("Identify user", async () => {
      await Sankofa.identify(userId, {
        email: userId,
        company,
        plan: "trial",
      });
    });
  };

  const handlePeopleSet = async () => {
    await runAction("Update person profile", async () => {
      await Sankofa.peopleSet({
        company,
        lifecycle_stage: "activated",
        seats: 4,
      });
    });
  };

  const handleReset = async () => {
    await runAction("Reset identity", async () => {
      await Sankofa.reset();
    });
  };

  const handleFlush = async () => {
    await runAction("Flush queue", async () => {
      await Sankofa.flush({
        reason: "manual",
        keepalive: true,
      });
    });
  };

  return (
    <main className="shell">
      <section className="panel hero">
        <p className="eyebrow">Sankofa Browser SDK</p>
        <h1>Web example with rrweb replay</h1>
        <p className="lede">
          This example initializes the browser SDK, keeps pageview autocapture on,
          and records rrweb replay chunks when replay is enabled.
        </p>
        <div className="config-grid">
          <p>
            <strong>Configured endpoint:</strong> <code>{endpoint}</code>
          </p>
          <p>
            <strong>Resolved batch URL:</strong>{" "}
            <code>{resolveBatchUrl(endpoint).toString()}</code>
          </p>
          <p>
            <strong>Resolved replay URL:</strong>{" "}
            <code>{resolveReplayChunkUrl(endpoint).toString()}</code>
          </p>
          <p>
            <strong>Replay enabled:</strong> <code>{String(replayEnabled)}</code>
          </p>
          <p>
            <strong>Ingest environment:</strong> <code>{ingestEnvironment}</code>
          </p>
        </div>
        {!sdkEnabled ? (
          <p className="lede">
            Set <code>VITE_SANKOFA_API_KEY</code> in <code>.env</code> to enable the
            live SDK controls below.
          </p>
        ) : null}
        <p className="status">{status}</p>
        {error ? <p className="status error">{error}</p> : null}
        <p className="lede">
          For the Vite example to reach the engine from <code>http://localhost:5173</code>,
          add that origin to <code>CORS_ALLOWED_ORIGINS</code>. Replay uploads also require
          the enterprise engine build and B2 replay storage configuration.
        </p>
        {ingestEnvironment === "test" ? (
          <p className="status">
            This API key is a <code>test</code> key. The dashboard must be switched to the
            <code> test </code> environment or the events view will stay empty.
          </p>
        ) : null}
        <div className="actions">
          <button disabled={!ready} onClick={handleTrack}>
            Track CTA click
          </button>
          <button className="secondary" disabled={!ready} onClick={handleFlush}>
            Flush now
          </button>
          <button
            className="ghost"
            disabled={!sdkEnabled || initializing}
            onClick={() => setRetryToken((value) => value + 1)}
          >
            {initializing ? "Initializing..." : "Retry init"}
          </button>
        </div>
      </section>

      <section className="panel grid">
        <div>
          <label htmlFor="user-id">User ID</label>
          <input
            id="user-id"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="company">Company</label>
          <input
            id="company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </div>
        <div className="actions">
          <button disabled={!ready} onClick={handleIdentify}>
            Identify
          </button>
          <button className="secondary" disabled={!ready} onClick={handlePeopleSet}>
            peopleSet
          </button>
          <button className="ghost" disabled={!ready} onClick={handleReset}>
            Reset
          </button>
        </div>
      </section>

      <section className="panel snapshot">
        <div className="snapshot-header">
          <h2>Current client snapshot</h2>
          <button className="secondary" disabled={!ready} onClick={refreshSnapshot}>
            Refresh snapshot
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
