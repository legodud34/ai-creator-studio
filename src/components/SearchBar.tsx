import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Video, Image, User, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  type: "video" | "image" | "user" | "genre";
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
  genre?: string | null;
}

const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", 
  "Horror", "Mystery", "Romance", "Sci-Fi", "Thriller",
  "Documentary", "Animation", "Music", "Nature", "Sports"
];

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);

      try {
        // Check if query matches a genre
        const matchingGenres = GENRES.filter(g => 
          g.toLowerCase().includes(query.toLowerCase())
        );

        // Search videos (include genre in results)
        const { data: videos } = await supabase
          .from("videos")
          .select("id, prompt, url, genre")
          .eq("is_public", true)
          .or(`prompt.ilike.%${query}%,genre.ilike.%${query}%`)
          .limit(10);

        // Search images
        const { data: images } = await supabase
          .from("images")
          .select("id, prompt, url")
          .eq("is_public", true)
          .ilike("prompt", `%${query}%`)
          .limit(5);

        // Search users
        const { data: users } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .ilike("username", `%${query}%`)
          .limit(5);

        // Group videos by genre
        const genreGroups = new Map<string, typeof videos>();
        videos?.forEach(v => {
          if (v.genre) {
            const existing = genreGroups.get(v.genre) || [];
            existing.push(v);
            genreGroups.set(v.genre, existing);
          }
        });

        const searchResults: SearchResult[] = [];

        // Add genre results first (for quick filtering)
        matchingGenres.forEach(genre => {
          searchResults.push({
            type: "genre",
            id: `genre-${genre}`,
            title: genre,
            subtitle: `Browse ${genre} videos`
          });
        });

        // Add videos grouped by genre
        const sortedVideos = [...(videos || [])].sort((a, b) => {
          // Sort by genre first, then by prompt
          if (a.genre && b.genre) {
            return a.genre.localeCompare(b.genre);
          }
          if (a.genre) return -1;
          if (b.genre) return 1;
          return 0;
        });

        sortedVideos.forEach(v => {
          searchResults.push({
            type: "video",
            id: v.id,
            title: v.prompt.slice(0, 50) + (v.prompt.length > 50 ? "..." : ""),
            subtitle: v.genre || "Video",
            url: v.url,
            genre: v.genre
          });
        });

        // Add images
        images?.forEach(i => {
          searchResults.push({
            type: "image",
            id: i.id,
            title: i.prompt.slice(0, 50) + (i.prompt.length > 50 ? "..." : ""),
            subtitle: "Image",
            url: i.url
          });
        });

        // Add users
        users?.forEach(u => {
          searchResults.push({
            type: "user",
            id: u.id,
            title: u.username,
            subtitle: "User"
          });
        });

        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "user") {
      navigate(`/profile/${result.title}`);
    } else if (result.type === "genre") {
      navigate(`/explore?genre=${encodeURIComponent(result.title)}`);
    } else if (result.type === "video") {
      navigate("/shorts");
    } else {
      navigate("/explore?tab=images");
    }
    setIsOpen(false);
    setQuery("");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4 text-accent" />;
      case "image":
        return <Image className="w-4 h-4 text-primary" />;
      case "user":
        return <User className="w-4 h-4 text-green-500" />;
      case "genre":
        return <Tag className="w-4 h-4 text-orange-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search by genre, title, creator..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10 h-9 glass border-border/50 focus:border-primary/50 w-48 md:w-64"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full mt-2 w-full md:w-80 right-0 bg-background border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          {isLoading ? (
            <div className="py-4 text-center text-muted-foreground text-sm">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              {results.map((result, index) => {
                // Add section headers for genres
                const showGenreHeader = result.type === "genre" && 
                  (index === 0 || results[index - 1]?.type !== "genre");
                const showVideoHeader = result.type === "video" && 
                  (index === 0 || results[index - 1]?.type === "genre");
                const showImageHeader = result.type === "image" && 
                  results[index - 1]?.type !== "image";
                const showUserHeader = result.type === "user" && 
                  results[index - 1]?.type !== "user";

                return (
                  <div key={`${result.type}-${result.id}`}>
                    {showGenreHeader && (
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase bg-muted/30">
                        Genres
                      </div>
                    )}
                    {showVideoHeader && (
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase bg-muted/30">
                        Videos
                      </div>
                    )}
                    {showImageHeader && (
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase bg-muted/30">
                        Images
                      </div>
                    )}
                    {showUserHeader && (
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase bg-muted/30">
                        Creators
                      </div>
                    )}
                    <button
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-primary/10 transition-colors text-left"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        <div className="flex items-center gap-2">
                          {result.genre && result.type === "video" ? (
                            <Badge variant="secondary" className="text-xs">
                              {result.genre}
                            </Badge>
                          ) : (
                            <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : query.length >= 2 ? (
            <div className="py-4 text-center text-muted-foreground text-sm">
              No results found
            </div>
          ) : null}
        </div>
      )}

      {/* Backdrop to close search */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default SearchBar;
