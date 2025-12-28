import { BadgeCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const VerifiedBadge = ({ size = "md", className = "" }: VerifiedBadgeProps) => {
  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <BadgeCheck 
            className={`text-blue-500 fill-blue-500 ${sizeClasses[size]} ${className}`}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Verified</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
