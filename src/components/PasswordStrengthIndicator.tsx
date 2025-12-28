import { useMemo } from "react";
import { Check, X, AlertTriangle } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const COMMON_PASSWORDS = [
  "password", "123456", "12345678", "qwerty", "abc123", "monkey", "1234567",
  "letmein", "trustno1", "dragon", "baseball", "iloveyou", "master", "sunshine",
  "ashley", "bailey", "passw0rd", "shadow", "123123", "654321", "superman",
  "qazwsx", "michael", "football", "password1", "password123", "welcome",
  "welcome1", "admin", "login", "starwars", "hello", "charlie", "donald",
];

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const checks = useMemo(() => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isNotCommon = !COMMON_PASSWORDS.some(
      (common) => password.toLowerCase().includes(common)
    );

    return {
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecial,
      isNotCommon,
    };
  }, [password]);

  const strength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (checks.hasMinLength) score++;
    if (checks.hasUppercase) score++;
    if (checks.hasLowercase) score++;
    if (checks.hasNumber) score++;
    if (checks.hasSpecial) score++;
    if (checks.isNotCommon) score++;
    return score;
  }, [password, checks]);

  const strengthLabel = useMemo(() => {
    if (strength <= 2) return { text: "Weak", color: "text-destructive" };
    if (strength <= 4) return { text: "Fair", color: "text-yellow-500" };
    return { text: "Strong", color: "text-green-500" };
  }, [strength]);

  const strengthBarColor = useMemo(() => {
    if (strength <= 2) return "bg-destructive";
    if (strength <= 4) return "bg-yellow-500";
    return "bg-green-500";
  }, [strength]);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strengthBarColor}`}
            style={{ width: `${(strength / 6) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${strengthLabel.color}`}>
          {strengthLabel.text}
        </span>
      </div>

      {/* Requirements list */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        <RequirementItem met={checks.hasMinLength} text="8+ characters" />
        <RequirementItem met={checks.hasUppercase} text="Uppercase letter" />
        <RequirementItem met={checks.hasLowercase} text="Lowercase letter" />
        <RequirementItem met={checks.hasNumber} text="Number" />
        <RequirementItem met={checks.hasSpecial} text="Special character" />
        <RequirementItem met={checks.isNotCommon} text="Not common" isWarning />
      </div>

      {/* Breach warning */}
      {!checks.isNotCommon && (
        <div className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 rounded-md p-2 mt-1">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>This password may have been exposed in data breaches</span>
        </div>
      )}
    </div>
  );
};

const RequirementItem = ({
  met,
  text,
  isWarning = false,
}: {
  met: boolean;
  text: string;
  isWarning?: boolean;
}) => (
  <div className="flex items-center gap-1">
    {met ? (
      <Check className="w-3 h-3 text-green-500" />
    ) : isWarning ? (
      <AlertTriangle className="w-3 h-3 text-amber-500" />
    ) : (
      <X className="w-3 h-3 text-muted-foreground" />
    )}
    <span className={met ? "text-muted-foreground" : "text-muted-foreground/60"}>
      {text}
    </span>
  </div>
);

export default PasswordStrengthIndicator;
