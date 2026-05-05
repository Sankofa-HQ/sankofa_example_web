import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Sankofa,
  resolveBatchUrl,
  resolveReplayChunkUrl,
  type SankofaClientSnapshot,
  type TransportStatus,
} from "@sankofa/browser";
import { rrwebReplayPlugin as sessionReplayPlugin } from "@sankofa/replay-rrweb";
import { switchPlugin, getSwitch } from "@sankofa/switch";
import { configPlugin, getConfig } from "@sankofa/config";
import { catchPlugin } from "@sankofa/catch";
import { pulsePlugin } from "@sankofa/pulse";
import { DEMO_FLAG_DEFAULTS, DEMO_CONFIG_DEFAULTS } from "../sankofaDemo";

export type SDKStatus = "booting" | "ready" | "error" | "disabled";

export type ActivityEntry = {
  id: string;
  ts: number;
  kind: "event" | "identify" | "people" | "reset" | "flush" | "error" | "info";
  label: string;
  detail?: string;
  payload?: Record<string, unknown>;
};

export interface SankofaContextValue {
  apiKey: string;
  endpoint: string;
  ingestEnvironment: "test" | "live";
  replayEnabled: boolean;
  status: SDKStatus;
  statusText: string;
  errorMessage: string | null;
  initializing: boolean;
  snapshot: SankofaClientSnapshot | null;
  transport: TransportStatus | null;
  activity: ActivityEntry[];
  counters: {
    events: number;
    errors: number;
    identifies: number;
    flushes: number;
  };
  refresh: () => void;
  remount: () => void;
  recordActivity: (entry: Omit<ActivityEntry, "id" | "ts">) => void;
  runAction: (label: string, action: () => Promise<void>) => Promise<boolean>;
  setApiKey: (key: string) => void;
  setEndpoint: (url: string) => void;
  clearApiKey: () => void;
  endpoints: {
    base: string;
    batch: string;
    replay: string;
  };
}

const API_KEY_STORAGE = "sankofa_sandbox_api_key";
const ENDPOINT_STORAGE = "sankofa_sandbox_endpoint";

function readStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(API_KEY_STORAGE)?.trim() ?? "";
  } catch {
    return "";
  }
}

function readStoredEndpoint(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(ENDPOINT_STORAGE)?.trim() || fallback;
  } catch {
    return fallback;
  }
}

const SankofaContext = createContext<SankofaContextValue | null>(null);

export function useSankofa(): SankofaContextValue {
  const ctx = useContext(SankofaContext);
  if (!ctx) throw new Error("useSankofa must be used within <SankofaProvider>");
  return ctx;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

let activitySeq = 0;
function nextId(): string {
  activitySeq += 1;
  return `${Date.now().toString(36)}-${activitySeq}`;
}

export function SankofaProvider({ children }: { children: ReactNode }) {
  const envEndpoint = import.meta.env.VITE_SANKOFA_ENDPOINT ?? "http://localhost:8080";
  const replayEnabled = import.meta.env.VITE_SANKOFA_ENABLE_REPLAY !== "false";

  // The API key is owned by the user, not the env. They paste it into
  // the gate (or sidebar input) and we persist it in localStorage so
  // refreshes keep working. Env still wins on first paint if set, so
  // CI / reviewers can pre-seed a key without UI clicks.
  const [apiKey, setApiKeyState] = useState<string>(() => {
    const stored = readStoredApiKey();
    if (stored) return stored;
    const env = import.meta.env.VITE_SANKOFA_API_KEY?.trim();
    return env ?? "";
  });
  const [endpoint, setEndpointState] = useState<string>(() =>
    readStoredEndpoint(envEndpoint),
  );

  const ingestEnvironment: "test" | "live" = apiKey.startsWith("sk_test_")
    ? "test"
    : "live";
  const sdkEnabled = apiKey.length > 0;

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    if (typeof window !== "undefined") {
      try {
        if (trimmed) {
          window.localStorage.setItem(API_KEY_STORAGE, trimmed);
        } else {
          window.localStorage.removeItem(API_KEY_STORAGE);
        }
      } catch {
        // Ignore storage failures (private mode, quota, etc.).
      }
    }
    setApiKeyState(trimmed);
  }, []);

  const clearApiKey = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(API_KEY_STORAGE);
      } catch {
        // ignore
      }
    }
    setApiKeyState("");
  }, []);

  const setEndpoint = useCallback(
    (url: string) => {
      const trimmed = url.trim() || envEndpoint;
      if (typeof window !== "undefined") {
        try {
          if (trimmed === envEndpoint) {
            window.localStorage.removeItem(ENDPOINT_STORAGE);
          } else {
            window.localStorage.setItem(ENDPOINT_STORAGE, trimmed);
          }
        } catch {
          // ignore
        }
      }
      setEndpointState(trimmed);
    },
    [envEndpoint],
  );

  const [status, setStatus] = useState<SDKStatus>(sdkEnabled ? "booting" : "disabled");
  const [statusText, setStatusText] = useState(
    sdkEnabled
      ? "Waiting for SDK initialization."
      : "Paste your Sankofa API key to wake the SDK.",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SankofaClientSnapshot | null>(null);
  const [transport, setTransport] = useState<TransportStatus | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [retryToken, setRetryToken] = useState(0);

  const recordActivity = useCallback((entry: Omit<ActivityEntry, "id" | "ts">) => {
    setActivity((prev) => {
      const next = [{ id: nextId(), ts: Date.now(), ...entry }, ...prev];
      return next.slice(0, 100);
    });
  }, []);

  const refresh = useCallback(() => {
    if (status === "ready") {
      setSnapshot(Sankofa.getSnapshot());
    }
  }, [status]);

  const remount = useCallback(() => {
    setRetryToken((n) => n + 1);
  }, []);

  // Counter for activity log items by kind. Cheap: O(n) over capped array.
  const counters = useMemo(() => {
    const c = { events: 0, errors: 0, identifies: 0, flushes: 0 };
    for (const a of activity) {
      if (a.kind === "event") c.events += 1;
      if (a.kind === "error") c.errors += 1;
      if (a.kind === "identify" || a.kind === "people") c.identifies += 1;
      if (a.kind === "flush") c.flushes += 1;
    }
    return c;
  }, [activity]);

  // Stable ref so closures inside the init effect can reach the latest
  // recordActivity without re-running the whole bootstrap.
  const recordRef = useRef(recordActivity);
  recordRef.current = recordActivity;

  const unsubscribeTransportRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!sdkEnabled) return;

    const initialize = async () => {
      try {
        setInitializing(true);
        setStatus("booting");
        setErrorMessage(null);
        setStatusText("Initializing Sankofa…");

        const plugins = [
          switchPlugin({ defaults: DEMO_FLAG_DEFAULTS }),
          configPlugin({ defaults: DEMO_CONFIG_DEFAULTS }),
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
          pulsePlugin({
            defaultFlagValues: (() => {
              const s = getSwitch();
              if (!s) return undefined;
              const out: Record<string, unknown> = {};
              for (const k of s.getAllKeys()) {
                const d = s.getDecision(k);
                if (d) out[k] = d.variant && d.variant.length > 0 ? d.variant : d.value;
              }
              return Object.keys(out).length ? out : undefined;
            })(),
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

        // Subscribe to transport status BEFORE the first flush so the
        // very first attempt's outcome (success or CORS / 401 / DNS)
        // is visible to the host UI immediately.
        const initialStatus = Sankofa.getTransportStatus();
        if (initialStatus) setTransport(initialStatus);
        const unsubTransport = Sankofa.onTransportStatus((next) => {
          if (cancelled) return;
          setTransport(next);
          if (next.lastResult === "error" && next.lastError) {
            recordRef.current({
              kind: "error",
              label: `flush failed (${next.lastFailureKind ?? "error"})`,
              detail: next.lastError,
              payload: {
                status: next.lastStatus,
                kind: next.lastFailureKind,
                batchUrl: next.batchUrl,
              },
            });
          }
        });

        await Sankofa.flush({ reason: "manual" });

        if (cancelled) {
          unsubTransport();
          return;
        }

        // Stash the unsubscriber on the cleanup path. The outer
        // useEffect's cleanup runs Sankofa.shutdown() but the listener
        // set lives on the queue manager — explicit removal here keeps
        // it tidy for the remount path.
        unsubscribeTransportRef.current = unsubTransport;

        setSnapshot(Sankofa.getSnapshot());
        setStatus("ready");
        setStatusText(
          replayEnabled
            ? "SDK ready. Live session recording active."
            : "SDK ready. Live tracking active (replay off).",
        );
        recordRef.current({
          kind: "info",
          label: "SDK initialized",
          detail: replayEnabled ? "with session replay" : "without session replay",
        });
      } catch (err) {
        if (cancelled) return;
        const message = formatError(err);
        setStatus("error");
        setSnapshot(null);
        setErrorMessage(message);
        setStatusText(`Initialization failed: ${message}`);
        recordRef.current({ kind: "error", label: "SDK init failed", detail: message });
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    void initialize();
    return () => {
      cancelled = true;
      unsubscribeTransportRef.current?.();
      unsubscribeTransportRef.current = null;
      setTransport(null);
      void Sankofa.shutdown();
    };
  }, [apiKey, endpoint, replayEnabled, ingestEnvironment, retryToken, sdkEnabled]);

  const runAction = useCallback<SankofaContextValue["runAction"]>(
    async (label, action) => {
      try {
        setErrorMessage(null);
        setStatusText(`${label} in progress…`);
        await action();
        await Sankofa.flush({ reason: "manual" });
        if (status === "ready") {
          setSnapshot(Sankofa.getSnapshot());
        }
        setStatusText(`${label} completed`);
        return true;
      } catch (err) {
        const message = formatError(err);
        setErrorMessage(message);
        setStatusText(`${label} failed: ${message}`);
        recordRef.current({ kind: "error", label, detail: message });
        return false;
      }
    },
    [status],
  );

  const value = useMemo<SankofaContextValue>(
    () => ({
      apiKey,
      endpoint,
      ingestEnvironment,
      replayEnabled,
      status,
      statusText,
      errorMessage,
      initializing,
      snapshot,
      transport,
      activity,
      counters,
      refresh,
      remount,
      recordActivity,
      runAction,
      setApiKey,
      setEndpoint,
      clearApiKey,
      endpoints: {
        base: endpoint,
        batch: resolveBatchUrl(endpoint).toString(),
        replay: resolveReplayChunkUrl(endpoint).toString(),
      },
    }),
    [
      apiKey,
      endpoint,
      ingestEnvironment,
      replayEnabled,
      status,
      statusText,
      errorMessage,
      initializing,
      snapshot,
      transport,
      activity,
      counters,
      refresh,
      remount,
      recordActivity,
      runAction,
      setApiKey,
      setEndpoint,
      clearApiKey,
    ],
  );

  return <SankofaContext.Provider value={value}>{children}</SankofaContext.Provider>;
}
