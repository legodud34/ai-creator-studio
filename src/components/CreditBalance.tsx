import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const CreditBalance = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_credits")
          .select("credits")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        setCredits(data?.credits ?? 0);
      } catch (error) {
        console.error("Error fetching credits:", error);
        setCredits(0);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();

    // Subscribe to credit changes
    if (user) {
      const channel = supabase
        .channel("credit-balance")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_credits",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new && "credits" in payload.new) {
              setCredits(payload.new.credits as number);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  if (!user) return null;

  return (
    <Link to="/credit-shop">
      <Button 
        variant="outline" 
        size="sm" 
        className="glass border-amber-500/50 text-amber-400 hover:border-amber-500 h-9 min-w-[80px]"
      >
        <Coins className="w-4 h-4 mr-1" />
        {loading ? (
          <span className="w-6 h-4 bg-amber-500/20 animate-pulse rounded" />
        ) : (
          <span className="font-semibold">{credits?.toLocaleString() ?? 0}</span>
        )}
      </Button>
    </Link>
  );
};

export default CreditBalance;
