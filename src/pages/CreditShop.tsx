import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Zap, Crown, Rocket, Loader2, Wallet, History, ExternalLink, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CREDIT_SHOP_BALANCE_TIMEOUT_MS = 8000;

const withTimeout = <T,>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> => {
  let t: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    t = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    if (t) window.clearTimeout(t);
  });
};

// Detect in-app browsers (Atlas, Facebook, Instagram, etc.)
const isInAppBrowser = (): boolean => {
  const ua = navigator.userAgent || navigator.vendor || "";

  // Common in-app browser identifiers
  if (/FBAN|FBAV|Instagram|Twitter|TikTok|Snapchat|Atlas|OpenAI/i.test(ua)) return true;

  // Android WebView typically includes "wv"
  if (/\bwv\b/i.test(ua)) return true;

  // NOTE: Safari exposes navigator.standalone even when false; check value, not presence.
  const nav = navigator as unknown as { standalone?: boolean };
  if (nav.standalone === true) return true;

  return false;
};

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
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutPackName, setCheckoutPackName] = useState<string | null>(null);

  const inAppBrowser = isInAppBrowser();

  // Fetch user's credit balance
  useEffect(() => {
    let cancelled = false;

    const fetchBalance = async () => {
      if (!user) {
        setLoadingBalance(false);
        return;
      }

      try {
        const query = supabase
          .from("user_credits")
          .select("credits")
          .eq("user_id", user.id)
          .maybeSingle();

        const { data, error } = await withTimeout(query, CREDIT_SHOP_BALANCE_TIMEOUT_MS, "Credit balance fetch");

        if (cancelled) return;
        if (error) throw error;
        setCreditBalance(data?.credits ?? 0);
      } catch (error) {
        console.error("[CreditShop] Error fetching credit balance:", error);
        if (!cancelled) setCreditBalance(0);
      } finally {
        if (!cancelled) setLoadingBalance(false);
      }
    };

    fetchBalance();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Handle success/cancel from Stripe redirect
  useEffect(() => {
    const success = searchParams.get("success");
    const credits = searchParams.get("credits");
    const sessionId = searchParams.get("session_id");
    const canceled = searchParams.get("canceled");

    const verifyPayment = async () => {
      if (success === "true" && sessionId && user) {
        try {
          // Call verify-payment to add credits (works even without webhook)
          const { data, error } = await supabase.functions.invoke("verify-payment", {
            body: { sessionId },
          });

          if (error) throw error;

          if (data?.success) {
            const addedCredits = data.addedCredits || credits;
            toast({
              title: "Payment successful!",
              description: data.alreadyProcessed 
                ? "Your credits have already been added." 
                : `${addedCredits} credits have been added to your account.`,
            });
            setCreditBalance(data.credits);
          } else {
            toast({
              title: "Payment pending",
              description: "Your payment is being processed. Credits will be added shortly.",
            });
          }
        } catch (error) {
          console.error("Payment verification error:", error);
          // Still show success but note it may take time
          toast({
            title: "Payment received!",
            description: `${credits} credits will be added to your account shortly.`,
          });
        }

        // Clear URL params
        window.history.replaceState({}, "", "/credit-shop");
      } else if (canceled === "true") {
        toast({
          title: "Payment canceled",
          description: "Your payment was canceled. No credits were added.",
          variant: "destructive",
        });
        window.history.replaceState({}, "", "/credit-shop");
      }
    };

    verifyPayment();
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

    // Ensure we have a valid auth session (otherwise the backend function call will fail)
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      toast({
        title: "Session expired",
        description: "Please sign in again to purchase credits.",
        variant: "destructive",
      });
      return;
    }

    // Clear any previous checkout URL
    setCheckoutUrl(null);
    setCheckoutPackName(null);
    setLoadingPack(pack.id);

    // Only use popup approach for in-app browsers (Atlas, etc.)
    // For normal browsers like Safari/Chrome, use standard redirect
    const usePopupApproach = inAppBrowser;
    let popup: Window | null = null;

    if (usePopupApproach) {
      // Open popup synchronously (user gesture) for in-app browser compatibility
      popup = window.open("about:blank", "_blank", "noopener");
    }

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: pack.priceId, credits: pack.credits },
      });

      if (error) throw error;

      if (data?.url) {
        if (usePopupApproach && popup && !popup.closed) {
          // In-app browser: navigate the pre-opened popup
          popup.location.href = data.url;
          toast({
            title: "Checkout opened",
            description: "Complete your purchase in the new tab.",
          });
        } else if (usePopupApproach) {
          // In-app browser but popup was blocked - show fallback button
          setCheckoutUrl(data.url);
          setCheckoutPackName(pack.name);
          toast({
            title: "Checkout ready",
            description: "Click the button below to open the payment page.",
          });
        } else {
          // Normal browser (Safari, Chrome, etc.): redirect directly
          window.location.href = data.url;
        }
      }
    } catch (error: any) {
      // Close the blank popup if it was opened
      if (popup && !popup.closed) {
        popup.close();
      }
      toast({
        title: "Purchase failed",
        description: error.message || "Failed to create checkout session.",
        variant: "destructive",
      });
    } finally {
      setLoadingPack(null);
    }
  };

  const handleOpenCheckout = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank", "noopener");
    }
  };

  const handleClearCheckout = () => {
    setCheckoutUrl(null);
    setCheckoutPackName(null);
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
              <strong className="text-foreground">25 credits</strong> = 1 video generation
            </span>
          </div>
        </div>

        {/* Checkout Fallback UI */}
        {checkoutUrl && (
          <div className="glass rounded-xl p-6 mb-8 border border-primary/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <ExternalLink className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Checkout Ready</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Your {checkoutPackName} checkout is ready. Click below to open the payment page.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleOpenCheckout} className="gradient-primary">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Stripe Checkout
                  </Button>
                  <Button variant="ghost" onClick={handleClearCheckout}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* In-app Browser Warning */}
        {inAppBrowser && (
          <div className="glass rounded-xl p-4 mb-8 border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">In-app browser detected.</strong>{" "}
                If payment doesn't open, use the "Open Stripe Checkout" button or open this page in Chrome/Safari.
              </span>
            </div>
          </div>
        )}

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
