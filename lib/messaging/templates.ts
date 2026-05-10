// Interpolate template variables — {{name}}, {{days_absent}}, {{expiry_date}}, etc.

export type TemplateVariables = {
  name?: string;
  days_absent?: number;
  expiry_date?: string;
  days_to_expiry?: number;
  package_name?: string;
  trainer_name?: string;
  gym_phone?: string;
  gym_name?: string;
};

export function interpolate(template: string, vars: TemplateVariables): string {
  const defaults: Required<TemplateVariables> = {
    name:           "Member",
    days_absent:    0,
    expiry_date:    "—",
    days_to_expiry: 0,
    package_name:   "your membership",
    trainer_name:   "your trainer",
    gym_phone:      "the gym",
    gym_name:       "Yos Fitness",
  };

  const merged = { ...defaults, ...vars };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = (merged as Record<string, any>)[key];
    return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
  });
}

// Default templates (used as fallback if DB has none)
export const DEFAULT_TEMPLATES = {
  INACTIVE_4_DAYS: "Hi {{name}}! We missed you at {{gym_name}} for {{days_absent}} days. Come back and keep the momentum going! 💪",
  INACTIVE_7_DAYS: "Hey {{name}}, it's been {{days_absent}} days! Your membership is valid till {{expiry_date}}. We'd love to see you back at {{gym_name}}. 🏋️",
  INACTIVE_14_DAYS: "{{name}}, we haven't seen you in 2 weeks. Please reach out to {{trainer_name}} or visit {{gym_name}}. Your health matters to us!",
  EXPIRY_7_DAYS: "Hi {{name}}, your {{package_name}} at {{gym_name}} expires on {{expiry_date}} ({{days_to_expiry}} days). Renew now to keep going! 🎯",
  EXPIRY_3_DAYS: "⚠️ {{name}}, your membership expires in 3 days ({{expiry_date}}). Visit {{gym_name}} or call {{gym_phone}} to renew.",
  EXPIRY_1_DAY: "🚨 {{name}}, membership expires TOMORROW ({{expiry_date}})! Please renew today at {{gym_name}}.",
  EXPIRY_TODAY: "{{name}}, your membership expires TODAY! Visit {{gym_name}} immediately to renew and avoid any gap.",
  ALREADY_EXPIRED: "Hi {{name}}, your membership expired on {{expiry_date}}. We miss you! Come back to {{gym_name}} — call us anytime.",
};
