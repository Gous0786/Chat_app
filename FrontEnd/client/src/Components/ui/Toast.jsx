import React, { createContext, useCallback, useContext, useState } from 'react';
import * as Radix from '@radix-ui/react-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

/**
 * Minimal toast system replacing MUI Snackbar/Alert.
 * Usage: const toast = useToast(); toast.success("Saved"); toast.error("Nope");
 * Requires <ToastProvider> mounted once near the app root.
 */
const ToastContext = createContext(null);

let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, variant) => {
    const id = ++idSeq;
    setToasts((t) => [...t, { id, message, variant }]);
  }, []);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const api = React.useMemo(
    () => ({
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      <Radix.Provider swipeDirection="right" duration={4000}>
        {children}
        <AnimatePresence>
          {toasts.map((t) => (
            <Radix.Root
              key={t.id}
              asChild
              onOpenChange={(open) => !open && remove(t.id)}
            >
              <motion.li
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className={cn(
                  'pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3',
                  'bg-surface-2/95 border shadow-glass backdrop-blur-xl',
                  t.variant === 'success' && 'border-accent/40',
                  t.variant === 'error' && 'border-red-500/50',
                  t.variant === 'info' && 'border-line-strong'
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    t.variant === 'success' && 'bg-accent',
                    t.variant === 'error' && 'bg-red-500',
                    t.variant === 'info' && 'bg-ink-muted'
                  )}
                />
                <Radix.Description className="font-sans text-sm text-ink">
                  {t.message}
                </Radix.Description>
              </motion.li>
            </Radix.Root>
          ))}
        </AnimatePresence>
        <Radix.Viewport className="fixed bottom-0 right-0 z-[60] m-6 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2.5 outline-none" />
      </Radix.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail soft: if provider is missing, log instead of crashing the app.
    return { success: console.log, error: console.error, info: console.log };
  }
  return ctx;
}
