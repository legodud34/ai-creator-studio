import { BadgeCheck, Crown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  type?: "verified" | "admin" | "both" | "owner";
  className?: string;
}

export const VerifiedBadge = ({ size = "md", type = "verified", className = "" }: VerifiedBadgeProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const colorClasses = {
    verified: "text-blue-500",
    admin: "text-purple-500",
    both: "text-amber-500",
    owner: "text-amber-400",
  };

  const glowStyles = {
    verified: { filter: "drop-shadow(0 0 6px rgba(59, 130, 246, 0.8))" },
    admin: { filter: "drop-shadow(0 0 6px rgba(168, 85, 247, 0.8))" },
    both: { filter: "drop-shadow(0 0 8px rgba(245, 158, 11, 0.8))" },
    owner: { filter: "drop-shadow(0 0 12px rgba(251, 191, 36, 1)) drop-shadow(0 0 20px rgba(251, 191, 36, 0.6))" },
  };

  const tooltipText = {
    verified: "Verified",
    admin: "Admin",
    both: "Verified Admin",
    owner: "Owner",
  };

  const isOwner = type === "owner";
  const IconComponent = isOwner ? Crown : BadgeCheck;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex ${isOwner ? "animate-pulse" : ""}`}>
            <IconComponent 
              className={`${colorClasses[type]} ${sizeClasses[size]} ${className}`}
              style={glowStyles[type]}
              strokeWidth={2.5}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText[type]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
