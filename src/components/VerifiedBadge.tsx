import { BadgeCheck } from "lucide-react";
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
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const colorClasses = {
    verified: "text-blue-500 fill-blue-500 drop-shadow-[0_0_6px_rgba(59,130,246,0.7)]",
    admin: "text-purple-500 fill-purple-500 drop-shadow-[0_0_6px_rgba(168,85,247,0.7)]",
    both: "text-amber-500 fill-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]",
    owner: "text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]",
  };

  const tooltipText = {
    verified: "Verified",
    admin: "Admin",
    both: "Verified Admin",
    owner: "Owner",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex animate-pulse">
            <BadgeCheck 
              className={`${colorClasses[type]} ${sizeClasses[size]} ${className}`}
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
