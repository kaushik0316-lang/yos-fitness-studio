export type WaType =
  | "BIRTHDAY"
  | "RENEWAL"
  | "WELCOME"
  | "PAYMENT"
  | "ENQUIRY"
  | "TERMS"
  | "GENERAL";

export const WA_TYPE_LABELS: Record<WaType, string> = {
  BIRTHDAY: "Birthday Wish",
  RENEWAL:  "Renewal Reminder",
  WELCOME:  "Welcome Message",
  PAYMENT:  "Payment Receipt",
  ENQUIRY:  "Enquiry Follow-up",
  TERMS:    "Terms & Conditions",
  GENERAL:  "General Message",
};
