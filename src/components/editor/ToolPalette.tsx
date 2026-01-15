import { 
  MousePointer2, 
  Hand, 
  Scissors, 
  Move, 
  Maximize2,
  Crop,
  Type,
  Square,
  Circle,
  Pen,
  Eraser,
  Pipette,
  ZoomIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type EditorTool = 
  | 'select'
  | 'hand'
  | 'blade'
  | 'position'
  | 'transform'
  | 'crop'
  | 'text'
  | 'shape'
  | 'pen'
  | 'zoom';

interface ToolPaletteProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
}

const tools: Array<{
  id: EditorTool;
  icon: React.ElementType;
  label: string;
  shortcut: string;
}> = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'hand', icon: Hand, label: 'Hand', shortcut: 'H' },
  { id: 'blade', icon: Scissors, label: 'Blade', shortcut: 'B' },
  { id: 'position', icon: Move, label: 'Position', shortcut: 'P' },
  { id: 'transform', icon: Maximize2, label: 'Transform', shortcut: 'T' },
  { id: 'crop', icon: Crop, label: 'Crop', shortcut: 'C' },
  { id: 'text', icon: Type, label: 'Text', shortcut: 'X' },
  { id: 'zoom', icon: ZoomIn, label: 'Zoom', shortcut: 'Z' },
];

export function ToolPalette({ activeTool, onToolChange }: ToolPaletteProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-0.5 p-1 bg-[#252525] border-r border-[#3a3a3a]">
        {tools.map(tool => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToolChange(tool.id)}
                className={cn(
                  'h-8 w-8 rounded',
                  activeTool === tool.id 
                    ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                    : 'text-gray-400 hover:text-white hover:bg-[#3a3a3a]'
                )}
              >
                <tool.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {tool.label} ({tool.shortcut})
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
