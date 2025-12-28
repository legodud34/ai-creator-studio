import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const GENRES = [
  "All",
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Sci-Fi",
  "Nature",
  "Travel",
  "Sports",
  "Tech",
  "Art",
] as const;

export type Genre = (typeof GENRES)[number];

interface GenreFilterProps {
  selectedGenre: Genre;
  onGenreChange: (genre: Genre) => void;
}

export const GenreFilter = ({ selectedGenre, onGenreChange }: GenreFilterProps) => {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        {GENRES.map((genre) => (
          <Button
            key={genre}
            variant={selectedGenre === genre ? "default" : "outline"}
            size="sm"
            onClick={() => onGenreChange(genre)}
            className={`rounded-full px-4 ${
              selectedGenre === genre 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
            }`}
          >
            {genre}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export { GENRES };
