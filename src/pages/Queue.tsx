import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TokenDisplay } from "@/components/TokenDisplay";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Token {
  id: string;
  token_number: number;
  status: string;
  created_at: string;
  customer_name: string | null;
  services: {
    name: string;
  };
}

export default function Queue() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTokens();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("tokens-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tokens",
        },
        () => {
          fetchTokens();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase
        .from("tokens")
        .select(`
          *,
          services (name)
        `)
        .in("status", ["waiting", "called", "serving"])
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTokens(data || []);
    } catch (error: any) {
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <header className="bg-gradient-to-r from-primary to-secondary py-8 px-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-4xl font-bold text-white">Live Queue Status</h1>
          <p className="text-white/80 mt-2">Real-time token updates</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-muted-foreground">No active tokens in queue</p>
            <Button onClick={() => navigate("/")} className="mt-6 bg-gradient-to-r from-primary to-secondary">
              Generate Your Token
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tokens.map((token) => (
              <TokenDisplay
                key={token.id}
                tokenNumber={token.token_number}
                serviceName={token.services.name}
                status={token.status}
                createdAt={token.created_at}
                customerName={token.customer_name || undefined}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}