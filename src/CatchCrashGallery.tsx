import { useMemo, useState } from "react";
import { Sankofa } from "@sankofa/browser";
import { getCatch } from "@sankofa/catch";

/**
 * CatchCrashGallery — one click per realistic frontend crash class.
 *
 * Sits next to the existing "smoke test" buttons and covers the
 * cases the smoke-tests can't reach: DOM nulls, JSON-parse on HTML,
 * stack overflow, custom business-logic errors with fingerprints,
 * manual breadcrumbs + handled captures, etc. Every event inherits
 * the sticky user + tags the parent App.tsx set at init time.
 */

type Scenario = {
    id: string;
    title: string;
    detail: string;
    run: () => void | Promise<void>;
};

class CheckoutValidationError extends Error {
    readonly cartId: string;
    readonly reason: string;
    readonly itemSku: string;
    constructor(params: { cartId: string; reason: string; itemSku: string }) {
        super(`checkout validation failed: ${params.reason} (item ${params.itemSku})`);
        this.name = "CheckoutValidationError";
        this.cartId = params.cartId;
        this.reason = params.reason;
        this.itemSku = params.itemSku;
    }
}

async function fetchUserProfile(id: string): Promise<{ id: string; name: string }> {
    const res = await fetch(`https://nonexistent.sankofa.invalid/users/${id}`);
    if (!res.ok) throw new Error(`profile fetch failed with ${res.status}`);
    return res.json();
}

export function CatchCrashGallery({ disabled }: { disabled: boolean }) {
    const [status, setStatus] = useState("Waiting for a crash…");

    const scenarios = useMemo<Scenario[]>(
        () => [
            {
                id: "type-error",
                title: "TypeError: null property access",
                detail: "reading .length on undefined — the most common browser crash",
                run: () => {
                    const apiResponse: { items?: Array<{ id: string }> } = {};
                    // @ts-expect-error — intentional: upstream omitted `items`
                    const count = apiResponse.items.length;
                    console.log("never reached", count);
                },
            },
            {
                id: "reference-error",
                title: "ReferenceError: undeclared identifier",
                detail: "typo / missing import / dead code",
                run: () => {
                    // @ts-expect-error — intentional undeclared global
                    trackAnalytics("click");
                },
            },
            {
                id: "unhandled-promise",
                title: "Unhandled promise rejection",
                detail: "async path throws, nothing catches",
                run: async () => {
                    // Not awaited — bubbles to window.unhandledrejection.
                    void fetchUserProfile("usr_does_not_exist");
                },
            },
            {
                id: "fetch-error",
                title: "fetch() to invalid host",
                detail: "network error + captureException with context",
                run: async () => {
                    try {
                        await fetch("https://nonexistent.sankofa.invalid/api/v1/me");
                    } catch (err) {
                        getCatch()?.captureException(err, {
                            level: "error",
                            tags: { subsystem: "network" },
                            extra: {
                                url: "https://nonexistent.sankofa.invalid/api/v1/me",
                                method: "GET",
                            },
                            fingerprint: ["network", "dns-resolution"],
                        });
                    }
                },
            },
            {
                id: "json-parse",
                title: "SyntaxError: JSON.parse on HTML",
                detail: "upstream returned 502 HTML where JSON was expected",
                run: () => {
                    const rawBody = "<!DOCTYPE html><html>502 Bad Gateway</html>";
                    getCatch()?.addBreadcrumb({
                        type: "http",
                        category: "parse",
                        message: "parsing /api/orders response",
                        level: "debug",
                        data: { content_type: "text/html; charset=utf-8", bytes: rawBody.length },
                    });
                    JSON.parse(rawBody);
                },
            },
            {
                id: "dom-null",
                title: "Null DOM element",
                detail: "querySelector returned null, code assumed present",
                run: () => {
                    const modal = document.querySelector('[data-modal="checkout"]');
                    // @ts-expect-error — assume non-null, fail loudly
                    modal.classList.add("open");
                },
            },
            {
                id: "stack-overflow",
                title: "RangeError: maximum call stack",
                detail: "infinite recursion",
                run: () => {
                    const recurse = (n: number): number => recurse(n + 1);
                    recurse(0);
                },
            },
            {
                id: "custom-error",
                title: "Custom error (handled) with fingerprint",
                detail: "business-logic error captured manually",
                run: () => {
                    try {
                        throw new CheckoutValidationError({
                            cartId: "cart_9fQ",
                            reason: "item_out_of_stock",
                            itemSku: "SKU-A7281",
                        });
                    } catch (err) {
                        getCatch()?.captureException(err, {
                            level: "warning",
                            fingerprint: ["checkout", "validation", "out-of-stock"],
                            tags: { flow: "checkout", stage: "validate" },
                            extra: { cart_id: "cart_9fQ", sku: "SKU-A7281" },
                        });
                    }
                },
            },
            {
                id: "setTimeout-throw",
                title: "Error inside setTimeout",
                detail: "no surrounding try/catch, no request scope",
                run: () => {
                    setTimeout(() => {
                        throw new Error("scheduled job threw after page load");
                    }, 100);
                },
            },
            {
                id: "log-warning",
                title: "captureMessage (no exception)",
                detail: "warning-level signal without an error",
                run: () => {
                    getCatch()?.captureMessage(
                        "user tried to open checkout with empty cart",
                        {
                            level: "warning",
                            tags: { surface: "checkout", issue: "empty-cart" },
                            extra: { items_in_cart: 0, user_segment: "trial" },
                        },
                    );
                },
            },
            {
                id: "breadcrumb-trail",
                title: "Manual breadcrumb trail",
                detail: "simulated flow → handled error with context breadcrumbs",
                run: () => {
                    const catcher = getCatch();
                    catcher?.addBreadcrumb({
                        type: "ui.click",
                        category: "button",
                        message: "click #add-to-cart",
                        level: "info",
                        data: { sku: "SKU-A7281", variant: "large" },
                    });
                    catcher?.addBreadcrumb({
                        type: "http",
                        category: "fetch",
                        message: "POST /api/cart",
                        level: "info",
                        data: { status: 500, duration_ms: 812 },
                    });
                    catcher?.addBreadcrumb({
                        type: "ui.transition",
                        category: "router",
                        message: "navigate /checkout → /cart",
                        level: "info",
                    });
                    try {
                        throw new Error("AddToCart failed: upstream returned 500");
                    } catch (err) {
                        catcher?.captureException(err, {
                            level: "error",
                            tags: { flow: "add-to-cart", retriable: "true" },
                        });
                    }
                },
            },

            // ── Phase A static helpers + Phase B withScope/beforeSend ──
            {
                id: "phase-a-log",
                title: "Sankofa.log() — Crashlytics-style breadcrumb",
                detail: "log() pushes a free-text crumb; the next captureException attaches it",
                run: () => {
                    Sankofa.log("user opened payment flow", "navigation");
                    Sankofa.log("cart total: 49.00 USD", "commerce");
                    Sankofa.log("tapped pay button", "user-action");
                    try {
                        throw new Error("payment gateway returned no token");
                    } catch (err) {
                        // The three log() entries above ride along on
                        // this event's breadcrumb trail.
                        Sankofa.captureException(err);
                    }
                },
            },
            {
                id: "phase-b-with-scope",
                title: "Phase B — withScope (temporary overlay)",
                detail: "tags + level + extras attached to ONE capture only",
                run: () => {
                    Sankofa.withScope((scope) => {
                        scope.setTag("checkout_step", "payment");
                        scope.setTag("payment_method", "stripe");
                        scope.setExtra("cart_id", "cart_8x92Lq");
                        scope.setExtra("cart_value_cents", 4900);
                        scope.setLevel("warning");
                        scope.setFingerprint(["checkout", "payment", "manual"]);
                        try {
                            throw new Error("payment gateway timeout — retried 3x");
                        } catch (err) {
                            // Only this capture carries the scope's
                            // extras + level.
                            Sankofa.captureException(err);
                        }
                    });
                    // Subsequent captures lose the scope.
                    Sankofa.captureMessage("post-scope event — no checkout_step tag");
                },
            },
            {
                id: "phase-b-with-scope-nested",
                title: "Phase B — withScope (nested scopes)",
                detail: "inner scope inherits + extends the outer at capture time",
                run: () => {
                    Sankofa.withScope((outer) => {
                        outer.setTag("feature", "billing");
                        outer.setExtra("checkout_session", "sess_12345");
                        Sankofa.withScope((inner) => {
                            inner.setTag("substep", "card-validation");
                            inner.setExtra("attempt", 2);
                            try {
                                throw new TypeError("invalid card number checksum");
                            } catch (err) {
                                // Carries BOTH feature=billing (outer)
                                // AND substep=card-validation (inner).
                                Sankofa.captureException(err);
                            }
                        });
                        // After inner pops, only outer's tags apply.
                        Sankofa.captureMessage("still in outer scope (no substep)");
                    });
                },
            },
            {
                id: "phase-b-before-send",
                title: "Phase B — beforeSend (see SankofaProvider.tsx)",
                detail: "fires events the hook should drop or scrub",
                run: () => {
                    // 1. "[noise]" → beforeSend returns null → dropped.
                    Sankofa.captureMessage("[noise] framework warning — drop me");
                    // 2. PII scrubbed — beforeSend rewrites user_email
                    //    before the event leaves the browser.
                    Sankofa.captureMessage(
                        "checkout failure — beforeSend should scrub user_email",
                        {
                            level: "info",
                            extra: {
                                user_email: "ada@example.com",
                                note: "beforeSend should redact user_email",
                            },
                        },
                    );
                },
            },
        ],
        [],
    );

    const runScenario = (scenario: Scenario) => {
        setStatus(`🚀 Triggering "${scenario.title}"…`);
        try {
            const result = scenario.run();
            if (result instanceof Promise) {
                void result.then(
                    () => setStatus(`✅ "${scenario.title}" dispatched (check dashboard)`),
                    () => setStatus(`✅ "${scenario.title}" dispatched via rejection`),
                );
            } else {
                setStatus(`✅ "${scenario.title}" fired (check dashboard)`);
            }
        } catch (err) {
            // Sync throws are caught by window.onerror — we don't
            // capture here so we don't double-report.
            setStatus(`💥 "${scenario.title}" threw: ${(err as Error).message}`);
        }
    };

    return (
        <div>
            <div className="crash-gallery-grid">
                {scenarios.map((scenario) => (
                    <button
                        key={scenario.id}
                        type="button"
                        className="crash-gallery-card"
                        disabled={disabled}
                        onClick={() => runScenario(scenario)}
                    >
                        <strong>{scenario.title}</strong>
                        <small>{scenario.detail}</small>
                    </button>
                ))}
            </div>
            <div className="crash-gallery-status">{status}</div>
        </div>
    );
}
