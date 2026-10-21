/** Shared domain types for the ClearGate usable-security prototype. */

export type AuthorizationMode = "traditional" | "usable";
export type RiskLevel = "low" | "medium" | "high";

export interface TransactionContext {
  amount: number;
  recipient: string;
  account: string;
  reference: string;
  newPayee: boolean;
  newDevice: boolean;
  unusualLocation: boolean;
  rapidActivity: boolean;
}

export interface RiskContribution {
  key: "amount" | "payee" | "device" | "location" | "velocity";
  label: string;
  detail: string;
  points: number;
}

export interface RiskAssessment {
  /** Heuristic index only; NOT a probability of fraud. Range: 0–100. */
  score: number;
  level: RiskLevel;
  recommendedAction: "Confirm transfer" | "Confirm on this device" | "Verify identity";
  contributions: RiskContribution[];
}

export type AuthorizationStage =
  | "ready"
  | "traditional-mfa"
  | "confirm"
  | "adaptive-confirm"
  | "adaptive-mfa"
  | "adaptive-code"
  | "review"
  | "success"
  | "cancelled";

export interface SessionEvent {
  id: string;
  message: string;
  timeLabel: string;
}
