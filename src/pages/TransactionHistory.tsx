import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Sparkles, Video, RefreshCw, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

const TransactionHistory = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditBalance, setCreditBalance] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch transactions
        const { data: txData, error: txError } = await supabase
          .from("credit_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (txError) throw txError;
        setTransactions(txData || []);

        // Fetch balance
        const { data: balanceData, error: balanceError } = await supabase
          .from("user_credits")
          .select("credits")
          .eq("user_id", user.id)
          .maybeSingle();

        if (balanceError) throw balanceError;
        setCreditBalance(balanceData?.credits ?? 0);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getTransactionIcon = (type: string, amount: number) => {
    if (type === "purchase") return <CreditCard className="w-5 h-5 text-green-400" />;
    if (type === "refund") return <RefreshCw className="w-5 h-5 text-blue-400" />;
    if (type === "image_generation") return <Sparkles className="w-5 h-5 text-purple-400" />;
    if (type === "video_generation") return <Video className="w-5 h-5 text-pink-400" />;
    return amount > 0 
      ? <TrendingUp className="w-5 h-5 text-green-400" />
      : <TrendingDown className="w-5 h-5 text-red-400" />;
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "purchase": return "Credit Purchase";
      case "refund": return "Refund";
      case "image_generation": return "Image Generation";
      case "video_generation": return "Video Generation";
      default: return type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getTransactionBadgeVariant = (type: string, amount: number) => {
    if (amount > 0) return "default";
    return "secondary";
  };

  return (
    <div className="min-h-screen gradient-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to="/credit-shop">
              <Button variant="ghost" size="icon" className="glass">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gradient">Transaction History</h1>
              <p className="text-muted-foreground mt-1">
                View all your credit activity
              </p>
            </div>
          </div>

          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold text-gradient">
                {creditBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-48 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-16 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <Card className="glass border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No transactions yet</h3>
              <p className="text-muted-foreground mb-4">Purchase credits to start generating content</p>
              <Link to="/credit-shop">
                <Button className="gradient-primary text-primary-foreground">
                  Go to Credit Shop
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <Card key={tx.id} className="glass border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full glass flex items-center justify-center">
                    {getTransactionIcon(tx.transaction_type, tx.amount)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {getTransactionLabel(tx.transaction_type)}
                      </span>
                      <Badge variant={getTransactionBadgeVariant(tx.transaction_type, tx.amount)}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </Badge>
                    </div>
                    {tx.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {tx.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(tx.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <div className={`text-lg font-bold ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/credit-shop">
            <Button variant="outline" className="glass">
              Back to Credit Shop
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
