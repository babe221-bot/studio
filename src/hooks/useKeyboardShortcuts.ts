import { useEffect, useCallback, useRef } from 'react';

interface UseKeyboardShortcutsOptions {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onToggleDimensions?: () => void;
  disabled?: boolean;
}

/**
 * Hook for handling keyboard shortcuts in the Lab component
 */
export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  onSave,
  onExport,
  onToggleDimensions,
  disabled = false,
}: UseKeyboardShortcutsOptions) {
  const handlersRef = useRef({
    onUndo,
    onRedo,
    onSave,
    onExport,
    onToggleDimensions,
  });

  // Keep handlers ref up to date
  useEffect(() => {
    handlersRef.current = {
      onUndo,
      onRedo,
      onSave,
      onExport,
      onToggleDimensions,
    };
  }, [onUndo, onRedo, onSave, onExport, onToggleDimensions]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      const { onUndo, onRedo, onSave, onExport, onToggleDimensions } =
        handlersRef.current;

      // Check for modifier keys
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to blur
        if (event.key === 'Escape') {
          (target as HTMLInputElement)?.blur();
          return;
        }
        return;
      }

      // Ctrl/Cmd + Z = Undo
      if (modKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        onUndo?.();
        return;
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
      if (
        (modKey && event.key === 'z' && event.shiftKey) ||
        (modKey && event.key === 'y')
      ) {
        event.preventDefault();
        onRedo?.();
        return;
      }

      // Ctrl/Cmd + S = Save
      if (modKey && event.key === 's') {
        event.preventDefault();
        onSave?.();
        return;
      }

      // Ctrl/Cmd + E = Export
      if (modKey && event.key === 'e') {
        event.preventDefault();
        onExport?.();
        return;
      }

      // Ctrl/Cmd + D = Toggle Dimensions
      if (modKey && event.key === 'd') {
        event.preventDefault();
        onToggleDimensions?.();
        return;
      }
    },
    [disabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
