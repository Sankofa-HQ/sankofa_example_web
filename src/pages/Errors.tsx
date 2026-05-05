import { useState } from "react";
import { Sankofa } from "@sankofa/browser";
import { getCatch } from "@sankofa/catch";
import { useSankofa } from "../lib/SankofaProvider";
import { CatchCrashGallery } from "../CatchCrashGallery";
import { ActivityFeed } from "../components/ActivityFeed";

export function ErrorsPage() {
  const sankofa = useSankofa();
  const ready = sankofa.status === "ready";
  const [breadcrumbCount, setBreadcrumbCount] = useState(0);

  const handleThrowUncaught = () => {
    sankofa.recordActivity({
      kind: "error",
      label: "uncaught error",
      detail: "scheduled via setTimeout",
    });
    setTimeout(() => {
      throw new Error(`Uncaught test error @ ${new Date().toISOString()}`);
    }, 0);
  };

  const handleRejectedPromise = () => {
    sankofa.recordActivity({
      kind: "error",
      label: "unhandled rejection",
      detail: "Promise.reject without catch",
    });
    void Promise.reject(
      new Error(`Unhandled rejection test @ ${new Date().toISOString()}`),
    );
  };

  const handleCaptureException = async () => {
    await sankofa.runAction("captureException", async () => {
      try {
        const payload: { id?: string } = {};
        // @ts-expect-error — intentional
        payload.id.toUpperCase();
      } catch (e) {
        getCatch()?.captureException(e, {
          tags: { area: "demo", page: "errors" },
          extra: { hint: "the payload had no id field" },
        });
        sankofa.recordActivity({
          kind: "error",
          label: "captureException()",
          detail: (e as Error).message,
          payload: { tags: { area: "demo" } },
        });
      }
      await getCatch()?.flush();
      await Sankofa.flush({ reason: "manual" });
    });
  };

  const handleCaptureMessage = async () => {
    await sankofa.runAction("captureMessage", async () => {
      getCatch()?.captureMessage("user reached deprecated route", {
        level: "warning",
        tags: { surface: "router", deprecated: "true" },
      });
      sankofa.recordActivity({
        kind: "error",
        label: "captureMessage(warning)",
        detail: "user reached deprecated route",
      });
      await getCatch()?.flush();
    });
  };

  const handleAddBreadcrumb = () => {
    const idx = breadcrumbCount + 1;
    getCatch()?.addBreadcrumb({
      type: "ui.click",
      category: "manual",
      message: `manual breadcrumb #${idx}`,
      level: "info",
      data: { source: "errors_page", index: idx },
    });
    sankofa.recordActivity({
      kind: "info",
      label: "addBreadcrumb()",
      detail: `manual breadcrumb #${idx}`,
      payload: { type: "ui.click", index: idx },
    });
    setBreadcrumbCount(idx);
  };

  return (
    <div className="page">
      <section className="panel hero-sub">
        <p className="eyebrow">Catch · Errors &amp; breadcrumbs</p>
        <h2>Crashes, rejections, handled exceptions — all in one stream.</h2>
        <p className="lede">
          Catch wires three entry points: window-level uncaught errors,
          unhandled promise rejections, and explicit{" "}
          <code>captureException()</code> calls. Every event carries the
          live flag + config snapshot, so you can see <em>which</em>{" "}
          experiment was on when it broke.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Smoke tests</h3>
            <p className="muted">
              Three minimal entry points. Routes to <code>/api/catch/events</code>.
            </p>
          </div>
          <span className="pill">{breadcrumbCount} breadcrumbs added</span>
        </div>
        <div className="actions">
          <button disabled={!ready} onClick={handleThrowUncaught}>
            Throw uncaught error
          </button>
          <button className="secondary" disabled={!ready} onClick={handleRejectedPromise}>
            Reject promise
          </button>
          <button className="secondary" disabled={!ready} onClick={handleCaptureException}>
            captureException()
          </button>
          <button className="secondary" disabled={!ready} onClick={handleCaptureMessage}>
            captureMessage(warning)
          </button>
          <button className="ghost" disabled={!ready} onClick={handleAddBreadcrumb}>
            Add breadcrumb
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Crash gallery</h3>
            <p className="muted">
              One click per realistic frontend crash class. Each one produces
              a distinct fingerprint in the dashboard&apos;s Issues list.
            </p>
          </div>
        </div>
        <CatchCrashGallery disabled={!ready} />
      </section>

      <ActivityFeed
        title="Error activity"
        description="Uncaught errors, rejections, and handled captures from this page."
        limit={15}
      />
    </div>
  );
}
