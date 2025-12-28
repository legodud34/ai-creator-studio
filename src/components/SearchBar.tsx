import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Video, Image, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  type: "video" | "image" | "user";
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
}

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
        // Search videos
        const { data: videos } = await supabase
          .from("videos")
          .select("id, prompt, url")
          .eq("is_public", true)
          .ilike("prompt", `%${query}%`)
          .limit(5);

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

        const searchResults: SearchResult[] = [
          ...(videos?.map(v => ({
            type: "video" as const,
            id: v.id,
            title: v.prompt.slice(0, 50) + (v.prompt.length > 50 ? "..." : ""),
            subtitle: "Video",
            url: v.url
          })) || []),
          ...(images?.map(i => ({
            type: "image" as const,
            id: i.id,
            title: i.prompt.slice(0, 50) + (i.prompt.length > 50 ? "..." : ""),
            subtitle: "Image",
            url: i.url
          })) || []),
          ...(users?.map(u => ({
            type: "user" as const,
            id: u.id,
            title: u.username,
            subtitle: "User"
          })) || [])
        ];

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
          placeholder="Search videos, images, creators..."
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
        <div className="absolute top-full mt-2 w-full md:w-80 right-0 glass border border-border/50 rounded-lg shadow-xl z-50 overflow-hidden">
          {isLoading ? (
            <div className="py-4 text-center text-muted-foreground text-sm">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-primary/10 transition-colors text-left"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.title}</p>
                    <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                  </div>
                </button>
              ))}
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
