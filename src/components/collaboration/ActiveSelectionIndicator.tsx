import React from 'react';
import { useCollabStore } from '@/store/useCollabStore';
import { cn } from '@/lib/utils';

interface ActiveSelectionIndicatorProps {
  fieldName: string;
  children: React.ReactNode;
  className?: string;
}

export const ActiveSelectionIndicator: React.FC<
  ActiveSelectionIndicatorProps
> = ({ fieldName, children, className }) => {
  const { onlineUsers, clientId } = useCollabStore();

  const editingUsers = onlineUsers.filter(
    (u) => u.selectedField === fieldName && u.userId !== clientId
  );

  const isBeingEdited = editingUsers.length > 0;

  return (
    <div className={cn('relative', className)}>
      {children}
      {isBeingEdited && (
        <div className="absolute -top-2 -right-2 flex -space-x-1">
          {editingUsers.map((user) => (
            <div
              key={user.userId}
              className="h-4 w-4 rounded-full border border-background bg-blue-500 text-[8px] flex items-center justify-center text-white ring-1 ring-blue-500"
              title={`${user.displayName} is editing this`}
            >
              {user.displayName.slice(0, 1).toUpperCase()}
            </div>
          ))}
        </div>
      )}
      {isBeingEdited && (
        <div className="absolute inset-0 border-2 border-blue-500/30 pointer-events-none rounded-md" />
      )}
    </div>
  );
};
