-- Create editor projects table
CREATE TABLE public.editor_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  video_url TEXT,
  timeline_data JSONB DEFAULT '{"tracks": [], "duration": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audio assets table for generated AI audio
CREATE TABLE public.audio_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.editor_projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('voiceover', 'sfx', 'music')),
  name TEXT NOT NULL,
  prompt TEXT,
  url TEXT NOT NULL,
  duration_seconds NUMERIC,
  voice_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.editor_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for editor_projects
CREATE POLICY "Users can view their own projects"
ON public.editor_projects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
ON public.editor_projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
ON public.editor_projects FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
ON public.editor_projects FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for audio_assets
CREATE POLICY "Users can view their own audio assets"
ON public.audio_assets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own audio assets"
ON public.audio_assets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audio assets"
ON public.audio_assets FOR DELETE
USING (auth.uid() = user_id);

-- Update trigger for editor_projects
CREATE TRIGGER update_editor_projects_updated_at
BEFORE UPDATE ON public.editor_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();