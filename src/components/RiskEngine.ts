import type { RiskAssessment, RiskContribution, TransactionContext } from "../types";

/**
 * Deterministic demonstration rule engine.
 *
 * Important: this is intentionally transparent so a portfolio reviewer can inspect
 * every contribution. It is not trained or calibrated, does not estimate fraud
 * probability, and must not be used for real financial authorization.
 */
export function assessRisk(transaction: TransactionContext): RiskAssessment {
  const contributions: RiskContribution[] = [
    {
      key: "amount",
      label: "Transfer amount",
      detail:
        transaction.amount > 1000
          ? "Above the demo's $1,000 review threshold"
          : transaction.amount > 500
            ? "Above the demo's $500 soft threshold"
            : "Within the demo's usual amount range",
      points: transaction.amount > 1000 ? 10 : transaction.amount > 500 ? 5 : 0,
    },
    {
      key: "payee",
      label: "Recipient history",
      detail: transaction.newPayee
        ? "This recipient has not been used before"
        : "Previously used recipient",
      points: transaction.newPayee ? 24 : 0,
    },
    {
      key: "device",
      label: "Device recognition",
      detail: transaction.newDevice
        ? "This device has not been recognized"
        : "Recognized device",
      points: transaction.newDevice ? 22 : 0,
    },
    {
      key: "location",
      label: "Location pattern",
      detail: transaction.unusualLocation
        ? "Sign-in location differs from the usual pattern"
        : "Location looks familiar",
      points: transaction.unusualLocation ? 18 : 0,
    },
    {
      key: "velocity",
      label: "Recent activity",
      detail: transaction.rapidActivity
        ? "Several transfers were attempted in a short period"
        : "No unusual transfer burst detected",
      points: transaction.rapidActivity ? 14 : 0,
    },
  ];

  const rawScore = 8 + contributions.reduce((sum, item) => sum + item.points, 0);
  const score = Math.max(0, Math.min(100, rawScore));
  const level = score < 25 ? "low" : score < 55 ? "medium" : "high";
  const recommendedAction =
    level === "low"
      ? "Confirm transfer"
      : level === "medium"
        ? "Confirm on this device"
        : "Verify identity";

  return { score, level, recommendedAction, contributions };
}
