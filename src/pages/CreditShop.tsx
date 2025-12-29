import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Zap, Crown, Rocket, Loader2, Wallet, History } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceId: string;
  icon: React.ReactNode;
  popular?: boolean;
  bestValue?: boolean;
  gradient: string;
}

const creditPacks: CreditPack[] = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 100,
    price: 4.99,
    priceId: "price_1SjVyKI8LU2uKxvOVajsmdJp",
    icon: <Sparkles className="w-8 h-8" />,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 500,
    price: 19.99,
    priceId: "price_1SjVzEI8LU2uKxvOtlihKevZ",
    icon: <Zap className="w-8 h-8" />,
    popular: true,
    gradient: "from-primary to-pink-500",
  },
  {
    id: "creator",
    name: "Creator Pack",
    credits: 1000,
    price: 29.99,
    priceId: "price_1SjW27I8LU2uKxvOwceq3lo7",
    icon: <Crown className="w-8 h-8" />,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    id: "studio",
    name: "Studio Pack",
    credits: 2000,
    price: 49.99,
    priceId: "price_1SjVziI8LU2uKxvOhCLPPDE9",
    icon: <Rocket className="w-8 h-8" />,
    bestValue: true,
    gradient: "from-accent to-blue-500",
  },
];

const CreditShop = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  // Fetch user's credit balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!user) {
        setLoadingBalance(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_credits")
          .select("credits")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        setCreditBalance(data?.credits ?? 0);
      } catch (error) {
        console.error("Error fetching credit balance:", error);
        setCreditBalance(0);
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [user]);

  // Handle success/cancel from Stripe redirect
  useEffect(() => {
    const success = searchParams.get("success");
    const credits = searchParams.get("credits");
    const canceled = searchParams.get("canceled");

    if (success === "true" && credits) {
      toast({
        title: "Payment successful!",
        description: `${credits} credits have been added to your account.`,
      });
      // Refresh balance
      if (user) {
        supabase
          .from("user_credits")
          .select("credits")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setCreditBalance(data.credits);
          });
      }
    } else if (canceled === "true") {
      toast({
        title: "Payment canceled",
        description: "Your payment was canceled. No credits were added.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast, user]);

  const handlePurchase = async (pack: CreditPack) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to purchase credits.",
        variant: "destructive",
      });
      return;
    }

    setLoadingPack(pack.id);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: pack.priceId, credits: pack.credits },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message || "Failed to create checkout session.",
        variant: "destructive",
      });
    } finally {
      setLoadingPack(null);
    }
  };

  const calculatePerCredit = (price: number, credits: number) => {
    return (price / credits).toFixed(3);
  };

  return (
    <div className="min-h-screen gradient-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="glass">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gradient">Credit Shop</h1>
              <p className="text-muted-foreground mt-1">
                Purchase credits to generate images and videos
              </p>
            </div>
          </div>
          
          {/* Credit Balance Card */}
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Balance</p>
              {loadingBalance ? (
                <div className="h-7 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold text-gradient">
                  {creditBalance?.toLocaleString() ?? 0}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-4 mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>
              <strong className="text-foreground">1 credit</strong> = 1 image generation
            </span>
            <span className="mx-2">•</span>
            <span>
              <strong className="text-foreground">10 credits</strong> = 1 video generation
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {creditPacks.map((pack) => (
            <Card
              key={pack.id}
              className={`glass border-border/50 relative overflow-hidden transition-all duration-300 hover:scale-105 hover:border-primary/50 ${
                pack.popular ? "ring-2 ring-primary" : ""
              } ${pack.bestValue ? "ring-2 ring-accent" : ""}`}
            >
              {pack.popular && (
                <Badge className="absolute top-4 right-4 gradient-primary border-0">
                  Popular
                </Badge>
              )}
              {pack.bestValue && (
                <Badge className="absolute top-4 right-4 gradient-accent border-0 text-accent-foreground">
                  Best Value
                </Badge>
              )}

              <CardHeader className="pb-4">
                <div
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${pack.gradient} flex items-center justify-center mb-4 text-white`}
                >
                  {pack.icon}
                </div>
                <CardTitle className="text-xl">{pack.name}</CardTitle>
                <CardDescription>
                  ${calculatePerCredit(pack.price, pack.credits)} per credit
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-gradient">
                    {pack.credits.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground">credits</div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <div className="text-2xl font-semibold">${pack.price}</div>
                <Button
                  className={`w-full bg-gradient-to-r ${pack.gradient} hover:opacity-90 text-white border-0`}
                  onClick={() => handlePurchase(pack)}
                  disabled={loadingPack === pack.id}
                >
                  {loadingPack === pack.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Purchase"
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center space-y-4">
          <Link to="/transactions">
            <Button variant="outline" className="glass">
              <History className="w-4 h-4 mr-2" />
              View Transaction History
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">
            Secure payments powered by Stripe. Credits never expire.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreditShop;
