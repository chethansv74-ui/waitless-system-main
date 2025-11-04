import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ServiceCard } from "@/components/ServiceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, LayoutDashboard } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string;
  average_wait_time: number;
}

const Index = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!selectedService) return;

    setGenerating(true);
    try {
      // Get next token number
      const { data: nextNum, error: numError } = await supabase
        .rpc("get_next_token_number", { service_uuid: selectedService.id });

      if (numError) throw numError;

      // Create token
      const { data: token, error: tokenError } = await supabase
        .from("tokens")
        .insert({
          token_number: nextNum,
          service_id: selectedService.id,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          status: "waiting",
        })
        .select()
        .single();

      if (tokenError) throw tokenError;

      toast.success("Token generated successfully!");
      setSelectedService(null);
      setCustomerName("");
      setCustomerPhone("");
      navigate("/queue");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate token");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-r from-primary via-secondary to-accent py-20 px-4">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        </div>
        <div className="relative max-w-6xl mx-auto text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-white drop-shadow-lg">
            Smart Queue Management
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            Skip the wait. Get your digital token instantly.
          </p>
          <Button 
            onClick={() => navigate("/admin")}
            variant="outline"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Admin Dashboard
          </Button>
        </div>
      </header>

      {/* Services Section */}
      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Select Your Service</h2>
          <p className="text-muted-foreground text-lg">
            Choose the service you need and get your token instantly
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                name={service.name}
                description={service.description || ""}
                averageWaitTime={service.average_wait_time}
                onSelect={() => setSelectedService(service)}
              />
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <Button
            onClick={() => navigate("/queue")}
            size="lg"
            variant="outline"
            className="bg-gradient-to-r from-primary/10 to-secondary/10"
          >
            View Live Queue Status
          </Button>
        </div>
      </main>

      {/* Token Generation Dialog */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Token for {selectedService?.name}</DialogTitle>
            <DialogDescription>
              Please provide your details (optional) to receive your token
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name (Optional)</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <Button
              onClick={handleGenerateToken}
              className="w-full bg-gradient-to-r from-primary to-secondary"
              disabled={generating}
            >
              {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Token
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;