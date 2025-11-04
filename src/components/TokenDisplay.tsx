import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";
import { format } from "date-fns";

interface TokenDisplayProps {
  tokenNumber: number;
  serviceName: string;
  status: string;
  createdAt: string;
  customerName?: string;
}

const statusColors = {
  waiting: "bg-amber-500",
  called: "bg-blue-500 animate-pulse",
  serving: "bg-purple-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

export const TokenDisplay = ({ 
  tokenNumber, 
  serviceName, 
  status, 
  createdAt,
  customerName 
}: TokenDisplayProps) => {
  return (
    <Card className="border-2 shadow-xl bg-gradient-to-br from-card via-background to-card">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
          Your Token Number
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-2">
          <div className="text-7xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {String(tokenNumber).padStart(3, '0')}
          </div>
          <Badge className={`${statusColors[status as keyof typeof statusColors]} text-white px-4 py-1`}>
            {status.toUpperCase()}
          </Badge>
        </div>
        
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="text-sm">{serviceName}</span>
          </div>
          {customerName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="text-sm">{customerName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{format(new Date(createdAt), 'hh:mm a')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};