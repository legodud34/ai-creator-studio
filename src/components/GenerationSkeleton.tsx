import { Skeleton } from "@/components/ui/skeleton";

interface GenerationSkeletonProps {
  type: "image" | "video";
}

const GenerationSkeleton = ({ type }: GenerationSkeletonProps) => {
  return (
    <div className="glass rounded-2xl overflow-hidden animate-pulse">
      <Skeleton className={`w-full ${type === "image" ? "aspect-square" : "aspect-video"}`} />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
};

export default GenerationSkeleton;
