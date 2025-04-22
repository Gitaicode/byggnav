'use client';

import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';

interface PageReloadContextProps {
  reloadTrigger: number;
  triggerReload: () => void;
}

const PageReloadContext = createContext<PageReloadContextProps | undefined>(undefined);

export const PageReloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const triggerReload = useCallback(() => {
    console.log('Context: triggerReload anropad');
    setReloadTrigger(prev => prev + 1); 
  }, []);

  return (
    <PageReloadContext.Provider value={{ reloadTrigger, triggerReload }}>
      {children}
    </PageReloadContext.Provider>
  );
};

export const usePageReload = (): PageReloadContextProps => {
  const context = useContext(PageReloadContext);
  if (context === undefined) {
    throw new Error('usePageReload must be used within a PageReloadProvider');
  }
  return context;
}; 