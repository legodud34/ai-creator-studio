import { BadgeCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  type?: "verified" | "admin" | "both";
  className?: string;
}

export const VerifiedBadge = ({ size = "md", type = "verified", className = "" }: VerifiedBadgeProps) => {
  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const colorClasses = {
    verified: "text-blue-500 fill-blue-500",
    admin: "text-purple-500 fill-purple-500",
    both: "text-amber-500 fill-amber-500",
  };

  const tooltipText = {
    verified: "Verified",
    admin: "Admin",
    both: "Verified Admin",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <BadgeCheck 
            className={`${colorClasses[type]} ${sizeClasses[size]} ${className}`}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText[type]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
