import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface ServiceCardProps {
  name: string;
  description: string;
  averageWaitTime: number;
  onSelect: () => void;
}

export const ServiceCard = ({ name, description, averageWaitTime, onSelect }: ServiceCardProps) => {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 bg-gradient-to-b from-card to-background">
      <CardHeader className="space-y-3">
        <CardTitle className="text-xl group-hover:text-primary transition-colors">
          {name}
        </CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {description}
        </CardDescription>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Clock className="h-4 w-4" />
          <span>~{averageWaitTime} min wait</span>
        </div>
        <Button 
          onClick={onSelect}
          className="w-full mt-4 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
        >
          Get Token
        </Button>
      </CardHeader>
    </Card>
  );
};