import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Users, Clock, CheckCircle, Loader2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

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

interface Stats {
  waiting: number;
  serving: number;
  completed: number;
  total: number;
}

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [stats, setStats] = useState<Stats>({ waiting: 0, serving: 0, completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          setTimeout(() => {
            navigate("/auth");
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) {
      fetchTokens();

      // Subscribe to real-time updates
      const channel = supabase
        .channel("admin-tokens")
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
    }
  }, [session]);

  const fetchTokens = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("tokens")
        .select(`
          *,
          services (name)
        `)
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTokens(data || []);

      // Calculate stats
      const waiting = data?.filter((t) => t.status === "waiting").length || 0;
      const serving = data?.filter((t) => t.status === "serving").length || 0;
      const completed = data?.filter((t) => t.status === "completed").length || 0;

      setStats({
        waiting,
        serving,
        completed,
        total: data?.length || 0,
      });
    } catch (error: any) {
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const updateTokenStatus = async (tokenId: string, status: "waiting" | "called" | "serving" | "completed" | "cancelled") => {
    try {
      const updateData: any = { status };
      
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      } else if (status === "called" || status === "serving") {
        updateData.called_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tokens")
        .update(updateData)
        .eq("id", tokenId);

      if (error) throw error;
      toast.success("Token updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update token");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!session || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <header className="bg-gradient-to-r from-primary to-secondary py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-white/80">Manage queue tokens and view analytics</p>
          </div>
          <Button onClick={handleLogout} variant="ghost" className="text-white hover:bg-white/20">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Waiting</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.waiting}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Serving</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.serving}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Today</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
        </div>

        {/* Active Tokens */}
        <Card>
          <CardHeader>
            <CardTitle>Active Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tokens
                .filter((t) => t.status !== "completed" && t.status !== "cancelled")
                .map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-bold text-primary">
                        {String(token.token_number).padStart(3, "0")}
                      </div>
                      <div>
                        <p className="font-medium">{token.services.name}</p>
                        {token.customer_name && (
                          <p className="text-sm text-muted-foreground">{token.customer_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={token.status === "waiting" ? "secondary" : "default"}
                        className="uppercase"
                      >
                        {token.status}
                      </Badge>
                      {token.status === "waiting" && (
                        <Button onClick={() => updateTokenStatus(token.id, "serving")} size="sm">
                          Call
                        </Button>
                      )}
                      {token.status === "serving" && (
                        <Button
                          onClick={() => updateTokenStatus(token.id, "completed")}
                          size="sm"
                          variant="outline"
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              {tokens.filter((t) => t.status !== "completed" && t.status !== "cancelled").length === 0 && (
                <p className="text-center text-muted-foreground py-8">No active tokens</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}