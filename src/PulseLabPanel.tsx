import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getPulse,
  type PulseEvent,
  type PulseEventPayload,
  type Survey,
} from "@sankofa/pulse";
import { DEMO_SURVEYS, DEMO_SURVEY_META } from "./sankofaDemo";

interface Props {
  ready: boolean;
}

/**
 * Pulse Lab — exercises every public surface of `getPulse()`:
 *
 *   - `show(surveyId, options)` — programmatic presentation
 *   - `getActiveMatchingSurveys()` — eligibility-filtered list
 *   - `on(event, listener)` — lifecycle hooks (each event logged)
 *
 * The "Pro user" toggle below sets `respondent.user_id = 'usr_demo_pro'`
 * and `userProperties.plan = 'pro'`, which the `productResearch`
 * survey's targeting rule requires. Toggle it off to demo a survey
 * that's intentionally ineligible.
 */
export function PulseLabPanel({ ready }: Props) {
  const [proUser, setProUser] = useState(true);
  const [eventLog, setEventLog] = useState<string[]>([]);
  // Live list of every published survey the API key's project owns
  // that's eligible for the current respondent context. Driven by
  // `getActiveMatchingSurveys()` — anything you create in the
  // dashboard shows up here on next refresh, no source edits needed.
  const [liveSurveys, setLiveSurveys] = useState<Survey[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Subscribe to every Pulse lifecycle event so the lab can show
  // exactly what the SDK fires + when. Resubscribe whenever `ready`
  // flips from false → true so the listener attaches to the active
  // singleton (Sankofa.shutdown() reset destroys the previous one).
  useEffect(() => {
    if (!ready) return;
    const api = getPulse();
    if (!api) return;
    const events: PulseEvent[] = [
      "survey_shown",
      "survey_dismissed",
      "survey_completed",
      "survey_partial_saved",
    ];
    const unsubs: Array<() => void> = [];
    for (const ev of events) {
      unsubs.push(
        api.on(ev, (payload: PulseEventPayload) => {
          const ts = new Date().toLocaleTimeString();
          const suffix = [
            payload.response_id ? `response=${payload.response_id}` : "",
            payload.reason ? `reason=${payload.reason}` : "",
          ]
            .filter(Boolean)
            .join(" · ");
          setEventLog((log) => {
            const entry = `${ts}  ${ev}${suffix ? ` — ${suffix}` : ""}`;
            const next = [entry, ...log];
            return next.slice(0, 40);
          });
        }),
      );
    }
    return () => {
      for (const u of unsubs) u();
    };
  }, [ready]);

  // Memoise the derived objects so their identity is stable across
  // renders. Without this, every render rebuilt `respondent` /
  // `userProperties` as fresh objects, which invalidated the
  // refreshSurveys callback's deps, which re-fired the useEffect,
  // which re-called getActiveMatchingSurveys() — an infinite loop
  // that hammered the engine with /api/pulse/surveys (and every
  // middleware below it: billing quota inserts, replay project
  // lookups, …) until the server slowed to a crawl.
  const respondent = useMemo(
    () =>
      proUser
        ? {
            user_id: "usr_demo_pro",
            external_id: "usr_demo_pro",
            email: "pro@example.com",
          }
        : { external_id: "usr_demo_free" },
    [proUser],
  );
  const userProperties = useMemo(
    () => (proUser ? { plan: "pro" } : { plan: "free" }),
    [proUser],
  );

  // Re-fetch the live survey list whenever the SDK becomes ready or
  // the respondent context flips (pro / free). The eligibility
  // evaluator runs against `respondent` + `userProperties`, so the
  // "Pro user" toggle directly drives which surveys the lab shows.
  // Deps deliberately use the primitive `proUser` boolean rather
  // than the memoised objects so a future tweak to either object's
  // shape doesn't reintroduce the render loop above.
  const refreshSurveys = useCallback(async () => {
    const api = getPulse();
    if (!api) return;
    setLoadingList(true);
    setListError(null);
    try {
      const eligible = await api.getActiveMatchingSurveys({
        respondent,
        context: { userProperties },
      });
      setLiveSurveys(eligible);
    } catch (err) {
      setListError((err as Error).message ?? "list failed");
      setLiveSurveys([]);
    } finally {
      setLoadingList(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proUser]);

  useEffect(() => {
    if (!ready) return;
    void refreshSurveys();
  }, [ready, refreshSurveys]);

  const handleShow = async (surveyId: string) => {
    const api = getPulse();
    if (!api) {
      window.alert(
        "Pulse not ready. Wait for the SDK to initialise before showing surveys.",
      );
      return;
    }
    try {
      await api.show(surveyId, {
        respondent,
        context: { userProperties },
      });
    } catch (err) {
      window.alert(`Pulse show failed: ${(err as Error).message}`);
    }
  };

  const handleProbe = async (surveyId: string) => {
    const api = getPulse();
    if (!api) return;
    try {
      const surveys = await api.getActiveMatchingSurveys();
      const matched = surveys.find((s) => s.id === surveyId);
      const summary = matched
        ? `eligible ✓ — ${surveys.length} survey(s) currently matching`
        : "ineligible — survey did not pass targeting evaluation";
      window.alert(`${DEMO_SURVEY_META[surveyId]?.title}: ${summary}`);
    } catch (err) {
      window.alert(`Eligibility probe failed: ${(err as Error).message}`);
    }
  };

  const dismiss = () => getPulse()?.dismiss();

  return (
    <div className="card pulse-lab">
      <div className="card-header">
        <h2>Pulse Lab</h2>
        <p className="muted">
          Exercise every public Pulse SDK surface: show a survey, probe
          eligibility, watch the lifecycle event stream below.
        </p>
      </div>

      {!ready && (
        <div className="warn">
          Sankofa not ready yet. Surveys will be enabled once the SDK
          finishes initialising.
        </div>
      )}

      <section className="block">
        <h3>Host context</h3>
        <p className="muted">
          Forwarded into <code>show()</code> and{" "}
          <code>getActiveMatchingSurveys()</code>. The "Product research"
          survey's targeting rule requires <code>plan = "pro"</code>.
        </p>
        <label className="toggle">
          <input
            type="checkbox"
            checked={proUser}
            onChange={(e) => setProUser(e.target.checked)}
          />
          <span>Pro user (plan = pro)</span>
        </label>
      </section>

      <section className="block">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <h3 style={{ margin: 0 }}>Project surveys (live)</h3>
          <button
            type="button"
            className="secondary"
            disabled={!ready || loadingList}
            onClick={refreshSurveys}
          >
            {loadingList ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <p className="muted small">
          Sourced from <code>getPulse().getActiveMatchingSurveys()</code>.
          Any published survey in your project that&apos;s eligible for
          the current respondent shows up here automatically — no source
          edits needed.
        </p>
        {listError && (
          <div className="warn small">Could not load surveys: {listError}</div>
        )}
        {!loadingList && !listError && liveSurveys.length === 0 && (
          <p className="muted small">
            No eligible surveys for the current respondent. Toggle{" "}
            <strong>Pro user</strong> above, or open the dashboard and
            confirm at least one survey is <em>published</em> with
            targeting that includes this respondent.
          </p>
        )}
        {liveSurveys.map((s) => (
          <div key={s.id} className="survey-row">
            <div className="survey-row-head">
              <strong>{s.name || s.id}</strong>
              <code>{s.id}</code>
            </div>
            {s.description && (
              <p className="muted small">{s.description}</p>
            )}
            <div className="row-actions">
              <button
                type="button"
                disabled={!ready}
                onClick={() => handleShow(s.id)}
              >
                Show
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="block">
        <h3>Demo surveys (seeded)</h3>
        {Object.values(DEMO_SURVEYS).map((id) => {
          const meta = DEMO_SURVEY_META[id];
          return (
            <div key={id} className="survey-row">
              <div className="survey-row-head">
                <strong>{meta?.title ?? id}</strong>
                <code>{id}</code>
              </div>
              <p className="muted small">{meta?.description}</p>
              <div className="row-actions">
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => handleShow(id)}
                >
                  Show
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={!ready}
                  onClick={() => handleProbe(id)}
                >
                  Check eligibility
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="block">
        <h3>Lifecycle event log</h3>
        <div className="row-actions" style={{ marginBottom: 8 }}>
          <button
            type="button"
            className="secondary"
            disabled={!ready}
            onClick={dismiss}
          >
            Dismiss any open survey
          </button>
          {eventLog.length > 0 && (
            <button
              type="button"
              className="secondary"
              onClick={() => setEventLog([])}
            >
              Clear log
            </button>
          )}
        </div>
        <p className="muted small">
          Subscribed via <code>getPulse().on(event, listener)</code>.
        </p>
        {eventLog.length === 0 ? (
          <p className="muted">No events yet. Press Show on a survey above.</p>
        ) : (
          <ul className="event-log">
            {eventLog.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
