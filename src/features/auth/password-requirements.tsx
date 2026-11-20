import { CircleCheck } from "lucide-react";
import { passwordRules } from "./password-policy";

export function PasswordRequirements({ id, value }: { id: string; value: string }) {
  return <div id={id} className="password-guide">
    <div className="password-guide-heading"><span>Syarat password</span><span className="password-length" data-invalid={value.length > 16 ? "true" : undefined}>{value.length}/16</span></div>
    <ul className="password-requirements" aria-label="Syarat password">{passwordRules.map(rule => <li key={rule.label} data-met={rule.test(value) ? "true" : "false"}><CircleCheck size={14} aria-hidden="true" /><span>{rule.label}</span>{rule.test(value) && <span className="sr-only"> terpenuhi</span>}</li>)}</ul>
  </div>;
}
