import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { assessRisk } from "./components/RiskEngine";
import type { AuthorizationMode, AuthorizationStage, SessionEvent, TransactionContext } from "./types";

const DEMO_CODE = "246810";
const initialTransaction: TransactionContext = {
  amount: 1480,
  recipient: "Amara Khan",
  account: "•••• 3084",
  reference: "TXN-2048-71",
  newPayee: true,
  newDevice: false,
  unusualLocation: false,
  rapidActivity: false,
};

function App() {
  const [mode, setMode] = useState<AuthorizationMode>("usable");
  const [transaction, setTransaction] = useState<TransactionContext>({ ...initialTransaction });
  const [stage, setStage] = useState<AuthorizationStage>("ready");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [events, setEvents] = useState<SessionEvent[]>([
    { id: "initial", message: "Demo workspace opened. No real transaction has been created.", timeLabel: "Just now" },
  ]);

  const risk = useMemo(() => assessRisk(transaction), [transaction]);
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(transaction.amount);
  const riskColor = risk.level === "low" ? "var(--teal)" : risk.level === "medium" ? "var(--amber)" : "var(--red)";
  const riskLabel = risk.level === "low" ? "Lower risk" : risk.level === "medium" ? "Elevated risk" : "High risk";

  function log(message: string) {
    setEvents((current) => [
      { id: `${Date.now()}-${Math.random()}`, message, timeLabel: "Just now" },
      ...current,
    ].slice(0, 5));
  }

  function resetFlow() {
    setStage("ready");
    setCode("");
    setError("");
  }

  // HCI: context edits invalidate the current step so users cannot act on stale authorization state.
  function updateContext<K extends keyof TransactionContext>(key: K, value: TransactionContext[K]) {
    setTransaction((current) => ({ ...current, [key]: value }));
    if (stage !== "ready") resetFlow();
  }

  function resetDemo() {
    setMode("usable");
    setTransaction({ ...initialTransaction });
    resetFlow();
    setEvents([{ id: `${Date.now()}`, message: "Demo reset. Ready to compare authorization experiences.", timeLabel: "Just now" }]);
  }

  // HCI: the baseline has fixed MFA; the comparison condition maps visible scenario risk to a proportionate step.
  function startAuthorization() {
    setCode("");
    setError("");
    if (mode === "traditional") {
      setStage("traditional-mfa");
      log("Traditional flow: fixed MFA challenge shown for this transfer.");
    } else if (risk.level === "low") {
      setStage("confirm");
      log("Adaptive flow: low-risk transfer moved to a clear confirmation step.");
    } else if (risk.level === "medium") {
      setStage("adaptive-confirm");
      log("Adaptive flow: step-up confirmation shown with a reason.");
    } else {
      setStage("adaptive-mfa");
      log("Adaptive flow: higher-risk context requires additional verification.");
    }
  }

  function authorizeSimulation() {
    setStage("success");
    setError("");
    log("Simulation completed: authorization approved by demo interaction; no money moved.");
  }

  function verifyCode() {
    if (code.trim() === DEMO_CODE) {
      authorizeSimulation();
      return;
    }
    if (mode === "traditional") {
      setError("ERR_SEC_9942 — Authentication failed. Contact support.");
      log("Traditional flow: opaque verification error shown.");
    } else {
      setError("That code did not match. Check the demo code or choose another recovery option.");
      log("Adaptive flow: verification error shown with recovery guidance.");
    }
  }

  function pauseForReview() {
    setStage("review");
    setError("");
    log("Transfer paused. A human review has been simulated; no real bank team was contacted.");
  }

  function cancelTransfer() {
    setStage("cancelled");
    setError("");
    log("User cancelled the simulated transfer before authorization.");
  }

  const actionButtons = (children: ReactNode) => <div className="action-row">{children}</div>;
  const primaryLabel = mode === "traditional" ? "Continue" : "Review security step";

  // HCI: each branch exposes current status, a comprehensible next action, and a visible exit/recovery route.
  function renderWorkflow() {
    if (stage === "ready") {
      return <div className="flow-panel">
        <div className="flow-title"><span aria-hidden="true">↗</span> Authorization preview</div>
        <div className="flow-copy">{mode === "traditional"
          ? "A fixed security challenge will appear before every transfer. The interface does not explain why this particular action needs the check."
          : risk.level === "low"
            ? "This scenario is below the demo's step-up threshold. You will see the recipient and amount again before confirming."
            : risk.level === "medium"
              ? "The new recipient or transfer context calls for an extra confirmation. The next step will explain the trigger and offer a clear path forward."
              : "Several risk signals are present. The demo will ask for additional verification and give you an option to pause and request human review."}</div>
        {actionButtons(<><button className={`btn ${mode === "usable" ? "primary" : "blue"}`} onClick={startAuthorization}>{primaryLabel} <span aria-hidden="true">→</span></button><button className="btn ghost" onClick={cancelTransfer}>Cancel transfer</button></>)}
      </div>;
    }

    if (stage === "traditional-mfa") {
      return <div className="flow-panel warn" role="region" aria-label="Traditional MFA challenge">
        <div className="flow-title"><span aria-hidden="true">▣</span> Additional security verification required</div>
        <div className="flow-copy">For your security, complete the required verification. If you cannot continue, contact support.</div>
        <span className="code">ERR_SEC_9942</span>
        <label className="block text-xs font-semibold mt-3" htmlFor="traditional-code">Security code</label>
        <input id="traditional-code" className="code-input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter 6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
        {error && <div className="flow-panel bad" role="alert" style={{ marginTop: 10, padding: 11 }}><div className="flow-copy" style={{ margin: 0, color: "#ffc5c8" }}>{error}</div></div>}
        {actionButtons(<><button className="btn blue" onClick={verifyCode}>Verify and continue</button><button className="btn ghost" onClick={cancelTransfer}>Cancel</button></>)}
        <div className="small-note">Prototype only: use demo code <b>246810</b>. Never use real banking credentials here.</div>
      </div>;
    }

    if (stage === "confirm") {
      return <div className="flow-panel good" role="region" aria-label="Transfer confirmation">
        <div className="flow-title"><span aria-hidden="true">✓</span> Check the details before sending</div>
        <div className="flow-copy">The context currently falls in the demo's lower-risk band. Confirm the amount and recipient below. You can still cancel.</div>
        <div className="facts"><div className="fact"><div className="fact-label">You are sending</div><div className="fact-value">{money}</div></div><div className="fact"><div className="fact-label">Recipient</div><div className="fact-value">{transaction.recipient}</div></div></div>
        {actionButtons(<><button className="btn primary" onClick={authorizeSimulation}>Confirm transfer</button><button className="btn ghost" onClick={cancelTransfer}>Cancel transfer</button></>)}
      </div>;
    }

    if (stage === "adaptive-confirm") {
      return <div className="flow-panel good" role="region" aria-label="Adaptive confirmation">
        <div className="flow-title"><span aria-hidden="true">◇</span> Confirm on this device</div>
        <div className="flow-copy">We noticed <b>{transaction.newPayee ? "this is a new recipient" : transaction.newDevice ? "this device is new" : "a change in this transfer's context"}</b>. Confirm that you initiated this transfer. This additional step helps protect transfers when context looks less familiar.</div>
        {actionButtons(<><button className="btn primary" onClick={authorizeSimulation}>Approve this transfer</button><button className="btn" onClick={() => { setStage("adaptive-code"); setCode(""); setError(""); }}>Use a demo code instead</button><button className="btn ghost" onClick={cancelTransfer}>Cancel transfer</button></>)}
      </div>;
    }

    if (stage === "adaptive-mfa" || stage === "adaptive-code") {
      const activeSignals = risk.contributions.filter((item) => item.points > 0).map((item) => item.label.toLowerCase()).join(", ");
      return <div className="flow-panel warn" role="region" aria-label="Risk-based verification">
        <div className="flow-title"><span aria-hidden="true">⚿</span> Additional verification needed</div>
        <div className="flow-copy">This transfer has a <b>{risk.level}-risk</b> context in the prototype (score {risk.score}/100). Signals: {activeSignals || "combined transaction context"}. To continue, verify with the simulated one-time code, or pause the transfer for human review.</div>
        <label className="block text-xs font-semibold mt-3" htmlFor="adaptive-code">One-time verification code</label>
        <input id="adaptive-code" className="code-input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter 6-digit demo code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
        {error && <div className="flow-panel bad" role="alert" style={{ marginTop: 10, padding: 11 }}><div className="flow-copy" style={{ margin: 0, color: "#ffc5c8" }}>{error}</div></div>}
        {actionButtons(<><button className="btn primary" onClick={verifyCode}>Verify and continue</button><button className="btn" onClick={pauseForReview}>Pause for human review</button><button className="btn ghost" onClick={cancelTransfer}>Cancel transfer</button></>)}
        <div className="small-note">Prototype only: use demo code <b>246810</b>. This is not a real OTP or authentication system.</div>
      </div>;
    }

    if (stage === "review") {
      return <div className="flow-panel warn" role="status"><div className="flow-title"><span aria-hidden="true">◷</span> Transfer paused for review</div><div className="flow-copy">Your transfer has not been sent. In a real banking service, this step would create a review case and explain when and how you can expect a response. This prototype only records the state locally.</div>{actionButtons(<><button className="btn" onClick={resetFlow}>Return to transaction</button><button className="btn ghost" onClick={cancelTransfer}>Cancel transfer</button></>)}</div>;
    }

    if (stage === "success") {
      return <div className="flow-panel good" role="status"><div className="success-mark" aria-hidden="true">✓</div><div className="section-kicker">Demo outcome</div><div className="flow-title">Authorization simulated successfully</div><div className="flow-copy">The prototype accepted the confirmation for {money} to {transaction.recipient}. <b>No money was moved, no bank service was contacted, and no real identity was verified.</b></div>{actionButtons(<><button className="btn primary" onClick={resetFlow}>Try another scenario</button><button className="btn ghost" onClick={resetDemo}>Reset full demo</button></>)}</div>;
    }

    return <div className="flow-panel" role="status"><div className="flow-title">Transfer cancelled</div><div className="flow-copy">You left the authorization flow before confirming. No transfer was made.</div>{actionButtons(<><button className="btn primary" onClick={resetFlow}>Return to transaction</button><button className="btn ghost" onClick={resetDemo}>Reset demo</button></>)}</div>;
  }

  return <div className="shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark" aria-hidden="true">C</div><div><div className="brand-name">ClearGate <span style={{ color: "#6f8cab", fontWeight: 500 }}> / banking security lab</span></div><div className="eyebrow" style={{ marginTop: 3 }}>Usable security · HCI portfolio prototype</div></div></div>
      <div className="prototype-pill">● Simulation only</div>
    </header>

    <section className="hero">
      <div><div className="eyebrow">Authorization experience comparison</div><h1>Security should protect people,<br className="hidden sm:block" /> not confuse them.</h1><p>Compare a rigid, opaque authorization flow with a risk-adaptive experience that explains the security step, guides recovery, and keeps the user in control.</p></div>
      <div className="mode-switch" role="group" aria-label="Choose authorization experience">
        <button className={`mode-btn ${mode === "traditional" ? "active" : ""}`} onClick={() => { setMode("traditional"); resetFlow(); log("Traditional banking interface selected."); }}>Traditional UX</button>
        <button className={`mode-btn ${mode === "usable" ? "active usable" : ""}`} onClick={() => { setMode("usable"); resetFlow(); log("Usable security interface selected."); }}>Usable Security UX</button>
      </div>
    </section>

    <div className="notice" role="note"><span aria-hidden="true" style={{ fontSize: 17 }}>ⓘ</span><div><b>Safe research prototype.</b> This app uses synthetic transaction details and a transparent demonstration rule set. It does not connect to a bank, assess real fraud, store credentials, or perform authentication. Risk thresholds are illustrative, not calibrated for financial use.</div></div>

    <main className="grid-main">
      <div className="stack">
        <section className="card" aria-labelledby="transaction-title">
          <div className="card-head"><div><div className="subtle-label">Transfer request</div><div className="card-title" id="transaction-title" style={{ marginTop: 6 }}>Review transaction</div><div className="card-sub">Check who is receiving the money and the amount before authorizing.</div></div><span className="tag blue">{transaction.reference}</span></div>
          <div className="subtle-label">Transfer amount</div><div className="amount"><span className="currency">USD</span>{Number(transaction.amount).toLocaleString("en-US")}.00</div><div className="card-sub">From: Everyday current account · •••• 4412</div>
          <div className="recipient"><div className="avatar" aria-hidden="true">AK</div><div><div className="recipient-name">{transaction.recipient}</div><div className="recipient-detail">{transaction.account} · Personal account</div></div><div className="spacer" /><span className={`tag ${transaction.newPayee ? "warn" : "good"}`}>{transaction.newPayee ? "NEW PAYEE" : "SAVED PAYEE"}</span></div>
          <div className="facts"><div className="fact"><div className="fact-label">Transfer type</div><div className="fact-value">One-time bank transfer</div></div><div className="fact"><div className="fact-label">Requested by</div><div className="fact-value">Umar · Demo profile</div></div><div className="fact"><div className="fact-label">Transaction ID</div><div className="fact-value">{transaction.reference}</div></div><div className="fact"><div className="fact-label">Authorization status</div><div className="fact-value" style={{ color: stage === "success" ? "var(--teal)" : stage === "review" ? "var(--amber)" : "#d4e3f5" }}>{stage === "success" ? "Simulated approval" : stage === "review" ? "Paused for review" : stage === "cancelled" ? "Cancelled" : "Awaiting confirmation"}</div></div></div>
        </section>

        <section className="card" aria-labelledby="context-title">
          <div className="card-head"><div><div className="subtle-label">Scenario controls</div><div className="card-title" id="context-title" style={{ marginTop: 6 }}>Change transaction context</div><div className="card-sub">Toggle synthetic signals to see how the security response adapts. These are test controls, not detected facts.</div></div><span className="tag blue">Interactive</span></div>
          <div className="controls">
            <div><div className="control-row"><label className="control-label" htmlFor="amount-range">Transfer amount</label><output className="range-value" htmlFor="amount-range">{money}</output></div><div className="range-wrap"><input id="amount-range" type="range" min="50" max="5000" step="50" value={transaction.amount} onChange={(event) => updateContext("amount", Number(event.target.value))} aria-describedby="amount-help" /></div><div className="control-row" style={{ marginTop: 5 }}><span className="control-help" id="amount-help">$50</span><span className="control-help">$5,000</span></div></div>
            <div className="toggle-list">
              <label className="toggle"><input type="checkbox" checked={transaction.newPayee} onChange={(event) => updateContext("newPayee", event.target.checked)} /><span>New recipient<small>First transfer to this payee</small></span></label>
              <label className="toggle"><input type="checkbox" checked={transaction.newDevice} onChange={(event) => updateContext("newDevice", event.target.checked)} /><span>Unrecognized device<small>Device is not in the trusted list</small></span></label>
              <label className="toggle"><input type="checkbox" checked={transaction.unusualLocation} onChange={(event) => updateContext("unusualLocation", event.target.checked)} /><span>Unusual location<small>Different from usual sign-in context</small></span></label>
              <label className="toggle"><input type="checkbox" checked={transaction.rapidActivity} onChange={(event) => updateContext("rapidActivity", event.target.checked)} /><span>Rapid activity<small>Several recent transfer attempts</small></span></label>
            </div>
          </div>
          {mode === "usable" ? <div className="explain-box"><div className="explain-head"><span aria-hidden="true">✦</span> Why the interface may add a check</div><p>{risk.level === "low" ? "No strong warning signals are active in this scenario. The prototype keeps the path simple and still asks you to review the payee and amount before confirming." : risk.level === "medium" ? "At least one unfamiliar signal is active. The prototype asks for an additional confirmation and tells you which context prompted it, rather than showing a generic block." : "Multiple signals are active at once. The prototype requires a simulated verification step and offers a pause-for-human-review option instead of leaving you at a dead end."}</p></div> : <div className="flow-panel" style={{ marginTop: 16 }}><div className="flow-title"><span aria-hidden="true">▣</span> Security check triggered</div><div className="flow-copy">The traditional variant uses the same fixed MFA requirement regardless of the selected context. It does not disclose the scoring rationale.</div></div>}
          {actionButtons(<><button className="btn ghost" onClick={resetDemo}>Reset scenario</button><span className="small-note" style={{ marginTop: 0, alignSelf: "center" }}>Changing context resets the current authorization step.</span></>)}
        </section>
      </div>

      <div className="stack">
        {mode === "usable" ? <section className="card" aria-labelledby="risk-title">
          <div className="card-head"><div><div className="subtle-label">Transparent risk feedback</div><div className="card-title" id="risk-title" style={{ marginTop: 6 }}>What is influencing the check?</div><div className="card-sub">A demonstration score makes the decision logic inspectable.</div></div><span className={`tag ${risk.level === "low" ? "good" : risk.level === "medium" ? "warn" : "bad"}`}>{riskLabel}</span></div>
          <div className="risk-top"><div><div className="subtle-label">Illustrative risk score</div><div className="risk-score" style={{ color: riskColor }}>{risk.score}<span style={{ fontSize: 13, color: "#7890ad", fontWeight: 650 }}>/100</span></div></div><div style={{ textAlign: "right" }}><div className="subtle-label">Next step</div><div style={{ fontWeight: 800, fontSize: 12, marginTop: 6 }}>{risk.recommendedAction}</div></div></div>
          <div className="risk-meter" aria-label={`Illustrative risk score ${risk.score} out of 100`}><div className="risk-meter-fill" style={{ width: `${risk.score}%`, background: riskColor }} /></div><div className="meter-scale"><span>Lower</span><span>Elevated</span><span>Higher</span></div>
          <div className="reason-list">{risk.contributions.map((item) => <div className="reason" key={item.key}><div><div className="reason-name">{item.label}</div><div className="reason-desc">{item.detail}</div></div><div className={`impact ${item.points > 0 ? "up" : "neutral"}`}>{item.points > 0 ? `+${item.points} pts` : "No added risk"}</div></div>)}</div>
          <div className="small-note">The score is a hand-coded heuristic (starting at 8, then adding visible points). It is not machine learning, a probability of fraud, or a production policy.</div>
        </section> : <section className="card" aria-labelledby="opaque-title"><div className="card-head"><div><div className="subtle-label">Traditional experience</div><div className="card-title" id="opaque-title" style={{ marginTop: 6 }}>Security decision</div><div className="card-sub">A representative opaque UI state. Detailed risk reasons are intentionally withheld in this variant.</div></div><span className="tag warn">Action blocked</span></div><div className="flow-panel warn" style={{ marginTop: 0 }}><div className="flow-title"><span aria-hidden="true">▣</span> Security verification required</div><div className="flow-copy">Your transaction requires additional authentication.</div><span className="code">ERR_SEC_9942</span><div className="small-note">No explanation of the triggering signal or recovery path is provided at this stage.</div></div><div className="divider" /><div className="card-sub">Comparison focus: fixed checks, technical language, and limited recovery versus explicit reasons and proportionate steps.</div></section>}

        <section className="card" aria-labelledby="workflow-title"><div className="card-head"><div><div className="subtle-label">Authorization journey</div><div className="card-title" id="workflow-title" style={{ marginTop: 6 }}>Continue safely</div><div className="card-sub">Progress through a simulated flow. You can always cancel before approval.</div></div><span className="tag blue">{mode === "usable" ? "Risk-adaptive" : "Fixed MFA"}</span></div>{renderWorkflow()}</section>

        <section className="card" aria-labelledby="activity-title"><div className="card-head"><div><div className="card-title" id="activity-title">Session activity</div><div className="card-sub">Visible feedback helps users understand what changed and why.</div></div><span className="tag good">Local only</span></div><div className="activity">{events.map((event) => <div className="activity-item" key={event.id}><div className="activity-dot" aria-hidden="true" /><div><div className="activity-text">{event.message}</div><div className="activity-time">{event.timeLabel}</div></div></div>)}</div></section>
      </div>
    </main>

    <footer className="footer"><span>ClearGate · HCI / Usable Security research prototype · Version 1.0</span><span>Illustrative data and behavior only. Do not enter real banking information.</span></footer>
  </div>;
}

export default App;
