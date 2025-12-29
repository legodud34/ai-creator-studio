-- Create user_credits table to track credit balances
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credit_transactions table to log all credit changes
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'image_generation', 'video_generation', 'refund', 'admin_adjustment')),
  stripe_session_id TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_credits
CREATE POLICY "Users can view own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage credits" ON public.user_credits
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for credit_transactions
CREATE POLICY "Users can view own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions" ON public.credit_transactions
  FOR INSERT WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to add credits (used by webhook)
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_stripe_session_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  -- Insert or update user credits
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET credits = user_credits.credits + p_amount, updated_at = now()
  RETURNING credits INTO new_balance;
  
  -- Log the transaction
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, stripe_session_id, description)
  VALUES (p_user_id, p_amount, p_transaction_type, p_stripe_session_id, p_description);
  
  RETURN new_balance;
END;
$$;

-- Create function to deduct credits
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT credits INTO current_balance 
  FROM public.user_credits 
  WHERE user_id = p_user_id;
  
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN -1; -- Insufficient credits
  END IF;
  
  -- Deduct credits
  UPDATE public.user_credits 
  SET credits = credits - p_amount, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING credits INTO new_balance;
  
  -- Log the transaction (negative amount for deduction)
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, -p_amount, p_transaction_type, p_description);
  
  RETURN new_balance;
END;
$$;