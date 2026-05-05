import { PulseLabPanel } from "../PulseLabPanel";
import { useSankofa } from "../lib/SankofaProvider";

export function SurveysPage() {
  const sankofa = useSankofa();
  return (
    <div className="page">
      <section className="panel hero-sub">
        <p className="eyebrow">Pulse · In-app surveys</p>
        <h2>NPS, CSAT, and branching research — all client-driven.</h2>
        <p className="lede">
          Pulse evaluates targeting in the SDK against live respondent
          properties, then renders the survey. Lifecycle events
          (<code>survey_shown</code>, <code>survey_completed</code>, …) are
          available via <code>getPulse().on()</code>.
        </p>
      </section>

      <PulseLabPanel ready={sankofa.status === "ready"} />
    </div>
  );
}
