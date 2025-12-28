import { useState, useRef } from "react";
import { Play } from "lucide-react";

interface VideoThumbnailProps {
  src: string;
  aspectRatio?: string;
  className?: string;
  showPlayButton?: boolean;
  playOnHover?: boolean;
}

export const VideoThumbnail = ({
  src,
  aspectRatio = "aspect-video",
  className = "",
  showPlayButton = true,
  playOnHover = true,
}: VideoThumbnailProps) => {
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (playOnHover && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (playOnHover && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className={`relative ${aspectRatio} bg-muted overflow-hidden ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail poster frame */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        muted
        playsInline
        preload="metadata"
        onLoadedData={() => setThumbnailLoaded(true)}
      />
      
      {/* Loading skeleton */}
      {!thumbnailLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <Play className="w-8 h-8 text-muted-foreground/30" />
        </div>
      )}

      {/* Play button overlay */}
      {showPlayButton && thumbnailLoaded && !isHovering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-transform group-hover:scale-110">
            <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
          </div>
        </div>
      )}
    </div>
  );
};
