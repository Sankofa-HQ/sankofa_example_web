import { useState } from "react";
import { Sankofa } from "@sankofa/browser";
import { useSankofa } from "../lib/SankofaProvider";
import { ActivityFeed } from "../components/ActivityFeed";

export function IdentityPage() {
  const sankofa = useSankofa();
  const ready = sankofa.status === "ready";

  const [userId, setUserId] = useState("demo-user@example.com");
  const [userName, setUserName] = useState("Demo User");
  const [avatarUrl, setAvatarUrl] = useState("https://i.pravatar.cc/150?u=demo");
  const [company, setCompany] = useState("Sankofa Labs");
  const [plan, setPlan] = useState("enterprise");

  const handleIdentify = async () => {
    await sankofa.runAction("identify + setPerson", async () => {
      await Sankofa.identify(userId);
      await Sankofa.setPerson({
        name: userName,
        email: userId,
        avatar: avatarUrl,
        company,
        plan,
      });
      sankofa.recordActivity({
        kind: "identify",
        label: "Sankofa.identify()",
        detail: userId,
        payload: { userId, userName, company, plan, avatarUrl },
      });
    });
  };

  const handlePeopleSet = async () => {
    await sankofa.runAction("setPerson traits", async () => {
      await Sankofa.setPerson({
        company,
        lifecycle_stage: "power_user",
        seats_active: 12,
        last_login_at: new Date().toISOString(),
      });
      sankofa.recordActivity({
        kind: "people",
        label: "Sankofa.setPerson()",
        detail: "lifecycle_stage=power_user",
        payload: { company, lifecycle_stage: "power_user", seats_active: 12 },
      });
    });
  };

  const handleReset = async () => {
    await sankofa.runAction("reset identity", async () => {
      await Sankofa.reset();
      sankofa.recordActivity({
        kind: "reset",
        label: "Sankofa.reset()",
        detail: "anonymous session restored",
      });
    });
  };

  const handleHandledEvent = async () => {
    await sankofa.runAction("track identity_change", async () => {
      await Sankofa.track("identity_change", { userId, plan });
      sankofa.recordActivity({
        kind: "event",
        label: "identity_change",
        detail: `${userId} → ${plan}`,
        payload: { userId, plan },
      });
    });
  };

  const distinctId = sankofa.snapshot?.distinctId;
  const isIdentified = Boolean(sankofa.snapshot?.identifiedId);

  return (
    <div className="page">
      <section className="panel hero-sub">
        <p className="eyebrow">Identity · identify · setPerson · reset</p>
        <h2>From anonymous to known, cleanly stitched.</h2>
        <p className="lede">
          Anonymous events are linked to a known user with{" "}
          <code>identify()</code>. Profile traits are merged via{" "}
          <code>setPerson()</code>. Logging out? <code>reset()</code> restores
          a fresh anonymous distinct id and clears local caches.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Current identity</h3>
            <p className="muted">Resolved from the live SDK snapshot.</p>
          </div>
          <button className="secondary" onClick={sankofa.refresh}>
            Refresh snapshot
          </button>
        </div>
        <div className="identity-card">
          <div className="identity-avatar">
            <img
              src={avatarUrl || "https://i.pravatar.cc/150?u=anon"}
              alt={userName}
            />
            <span
              className="identity-status"
              style={{ background: isIdentified ? "var(--success)" : "#94a3b8" }}
            />
          </div>
          <div className="identity-meta">
            <strong>{isIdentified ? userName : "Anonymous visitor"}</strong>
            <span className="muted small">distinct_id: {distinctId ?? "—"}</span>
            {isIdentified && <span className="muted small">{userId}</span>}
          </div>
          <span
            className="pill"
            style={{
              background: isIdentified ? "rgba(16,185,129,0.15)" : "rgba(148,163,184,0.15)",
              color: isIdentified ? "#86efac" : "#cbd5e1",
            }}
          >
            {isIdentified ? "Identified" : "Anonymous"}
          </span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Traits</h3>
            <p className="muted">
              Edit and apply. <code>setPerson()</code> deep-merges; existing
              keys not in the call are preserved.
            </p>
          </div>
        </div>
        <div className="grid">
          <Field label="Customer ID (email or DB id)">
            <input value={userId} onChange={(e) => setUserId(e.target.value)} />
          </Field>
          <Field label="Display name">
            <input value={userName} onChange={(e) => setUserName(e.target.value)} />
          </Field>
          <Field label="Organization">
            <input value={company} onChange={(e) => setCompany(e.target.value)} />
          </Field>
          <Field label="Plan">
            <select value={plan} onChange={(e) => setPlan(e.target.value)}>
              <option value="free">free</option>
              <option value="pro">pro</option>
              <option value="enterprise">enterprise</option>
            </select>
          </Field>
          <Field label="Avatar URL">
            <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
          </Field>
        </div>

        <div className="actions">
          <button disabled={!ready} onClick={handleIdentify}>
            Identify customer
          </button>
          <button className="secondary" disabled={!ready} onClick={handlePeopleSet}>
            Update traits only
          </button>
          <button className="secondary" disabled={!ready} onClick={handleHandledEvent}>
            Track identity_change
          </button>
          <button className="ghost" disabled={!ready} onClick={handleReset}>
            Anonymize session
          </button>
        </div>
      </section>

      <ActivityFeed
        title="Identity activity"
        description="identify(), setPerson(), and reset() calls land here in real time."
        limit={15}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label>{label}</label>
      {children}
    </div>
  );
}
