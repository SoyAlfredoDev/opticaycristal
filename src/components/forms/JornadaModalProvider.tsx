"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import JornadaRequestModal from "@/components/forms/JornadaRequestModal";

interface JornadaModalContextValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const JornadaModalContext = createContext<JornadaModalContextValue | null>(null);

export function JornadaModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ open, close, isOpen }),
    [open, close, isOpen]
  );

  return (
    <JornadaModalContext.Provider value={value}>
      {children}
      <JornadaRequestModal open={isOpen} onClose={close} />
    </JornadaModalContext.Provider>
  );
}

export function useJornadaModal() {
  const context = useContext(JornadaModalContext);
  if (!context) {
    throw new Error("useJornadaModal debe usarse dentro de JornadaModalProvider");
  }
  return context;
}
