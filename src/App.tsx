import { useEffect, useState } from "react";
import { Sankofa, type SankofaClientSnapshot } from "@sankofa/browser";

export default function App() {
  const sdkEnabled = Boolean(import.meta.env.VITE_SANKOFA_API_KEY);
  const [snapshot, setSnapshot] = useState<SankofaClientSnapshot | null>(null);
  const [userId, setUserId] = useState("demo-user@example.com");
  const [company, setCompany] = useState("Sankofa Labs");

  useEffect(() => {
    if (sdkEnabled) {
      setSnapshot(Sankofa.getSnapshot());
    }
  }, [sdkEnabled]);

  const refreshSnapshot = () => {
    if (sdkEnabled) {
      setSnapshot(Sankofa.getSnapshot());
    }
  };

  const handleTrack = async () => {
    await Sankofa.track("web_example_button_clicked", {
      area: "hero",
      variant: "primary",
      revenue: 149,
    });
    refreshSnapshot();
  };

  const handleIdentify = async () => {
    await Sankofa.identify(userId, {
      email: userId,
      company,
      plan: "trial",
    });
    refreshSnapshot();
  };

  const handlePeopleSet = async () => {
    await Sankofa.peopleSet({
      company,
      lifecycle_stage: "activated",
      seats: 4,
    });
  };

  const handleReset = async () => {
    await Sankofa.reset();
    refreshSnapshot();
  };

  const handleFlush = async () => {
    await Sankofa.flush({
      reason: "manual",
      keepalive: true,
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
        {!sdkEnabled ? (
          <p className="lede">
            Set <code>VITE_SANKOFA_API_KEY</code> in <code>.env</code> to enable the
            live SDK controls below.
          </p>
        ) : null}
        <div className="actions">
          <button disabled={!sdkEnabled} onClick={handleTrack}>
            Track CTA click
          </button>
          <button className="secondary" disabled={!sdkEnabled} onClick={handleFlush}>
            Flush now
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
          <button disabled={!sdkEnabled} onClick={handleIdentify}>
            Identify
          </button>
          <button className="secondary" disabled={!sdkEnabled} onClick={handlePeopleSet}>
            peopleSet
          </button>
          <button className="ghost" disabled={!sdkEnabled} onClick={handleReset}>
            Reset
          </button>
        </div>
      </section>

      <section className="panel snapshot">
        <div className="snapshot-header">
          <h2>Current client snapshot</h2>
          <button className="secondary" disabled={!sdkEnabled} onClick={refreshSnapshot}>
            Refresh snapshot
          </button>
        </div>
        <pre>{JSON.stringify(snapshot, null, 2)}</pre>
      </section>
    </main>
  );
}
