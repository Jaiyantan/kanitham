'use client';

import React, { createContext, useContext, useState } from 'react';

export type ContextPanelType = 'order' | 'lorry' | 'customer' | 'godown' | null;

interface ContextPanelContextType {
  isOpen: boolean;
  type: ContextPanelType;
  entityId: string | null;
  openPanel: (type: ContextPanelType, id: string) => void;
  closePanel: () => void;
}

const ContextPanelContext = createContext<ContextPanelContextType>({
  isOpen: false,
  type: null,
  entityId: null,
  openPanel: () => {},
  closePanel: () => {},
});

export function ContextPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<ContextPanelType>(null);
  const [entityId, setEntityId] = useState<string | null>(null);

  const openPanel = (newType: ContextPanelType, id: string) => {
    setType(newType);
    setEntityId(id);
    setIsOpen(true);
  };

  const closePanel = () => {
    setIsOpen(false);
    setType(null);
    setEntityId(null);
  };

  return (
    <ContextPanelContext.Provider
      value={{ isOpen, type, entityId, openPanel, closePanel }}
    >
      {children}
    </ContextPanelContext.Provider>
  );
}

export function useContextPanel() {
  return useContext(ContextPanelContext);
}

