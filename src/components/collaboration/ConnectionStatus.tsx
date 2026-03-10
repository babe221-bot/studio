import React from 'react';
import { useCollabStore } from '@/store/useCollabStore';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

export const ConnectionStatus: React.FC = () => {
  const { isConnected } = useCollabStore();

  return (
    <div className="flex items-center px-2">
      {isConnected ? (
        <Badge
          variant="outline"
          className="flex items-center gap-1 text-green-500 border-green-200 bg-green-50"
        >
          <Wifi className="h-3 w-3" />
          <span className="text-[10px]">Live</span>
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="flex items-center gap-1 text-muted-foreground bg-muted/50"
        >
          <WifiOff className="h-3 w-3" />
          <span className="text-[10px]">Offline</span>
        </Badge>
      )}
    </div>
  );
};
