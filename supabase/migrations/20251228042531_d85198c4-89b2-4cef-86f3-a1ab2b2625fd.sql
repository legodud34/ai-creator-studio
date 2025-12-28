-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'like', 'comment', 'follow'
  actor_id UUID NOT NULL, -- user who triggered the notification
  content_id UUID, -- video or image id
  content_type TEXT, -- 'video', 'image'
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (via triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create function to create notification on like
CREATE OR REPLACE FUNCTION public.handle_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  content_owner_id UUID;
  content_type_val TEXT;
  content_id_val UUID;
BEGIN
  -- Determine content type and owner
  IF NEW.video_id IS NOT NULL THEN
    SELECT user_id INTO content_owner_id FROM videos WHERE id = NEW.video_id;
    content_type_val := 'video';
    content_id_val := NEW.video_id;
  ELSIF NEW.image_id IS NOT NULL THEN
    SELECT user_id INTO content_owner_id FROM images WHERE id = NEW.image_id;
    content_type_val := 'image';
    content_id_val := NEW.image_id;
  END IF;
  
  -- Don't notify if user likes their own content
  IF content_owner_id IS NOT NULL AND content_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, actor_id, content_id, content_type)
    VALUES (content_owner_id, 'like', NEW.user_id, content_id_val, content_type_val);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for likes
CREATE TRIGGER on_like_created
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_like_notification();

-- Create function to create notification on comment
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  content_owner_id UUID;
  content_type_val TEXT;
  content_id_val UUID;
BEGIN
  IF NEW.video_id IS NOT NULL THEN
    SELECT user_id INTO content_owner_id FROM videos WHERE id = NEW.video_id;
    content_type_val := 'video';
    content_id_val := NEW.video_id;
  ELSIF NEW.image_id IS NOT NULL THEN
    SELECT user_id INTO content_owner_id FROM images WHERE id = NEW.image_id;
    content_type_val := 'image';
    content_id_val := NEW.image_id;
  END IF;
  
  IF content_owner_id IS NOT NULL AND content_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, actor_id, content_id, content_type, message)
    VALUES (content_owner_id, 'comment', NEW.user_id, content_id_val, content_type_val, LEFT(NEW.content, 100));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for comments
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_comment_notification();

-- Create function to create notification on follow
CREATE OR REPLACE FUNCTION public.handle_follow_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id)
  VALUES (NEW.following_id, 'follow', NEW.follower_id);
  
  RETURN NEW;
END;
$$;

-- Create trigger for follows
CREATE TRIGGER on_follow_created
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.handle_follow_notification();