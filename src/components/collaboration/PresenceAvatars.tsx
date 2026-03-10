import React from 'react';
import { useCollabStore } from '@/store/useCollabStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const PresenceAvatars: React.FC = () => {
  const { onlineUsers, clientId } = useCollabStore();

  return (
    <TooltipProvider>
      <div className="flex -space-x-2 overflow-hidden px-2">
        {onlineUsers.map((user) => (
          <Tooltip key={user.userId}>
            <TooltipTrigger asChild>
              <div className="relative inline-block ring-2 ring-background rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                  <AvatarFallback className="text-[10px]">
                    {user.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {user.userId === clientId && (
                  <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-1 ring-white" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {user.displayName} {user.userId === clientId ? '(You)' : ''}
              </p>
              {user.selectedField && (
                <p className="text-xs text-muted-foreground">
                  Editing: {user.selectedField}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};
