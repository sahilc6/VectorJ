import React, { createContext, useContext } from 'react';
import { useAppState } from '../hooks/useAppState';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const state = useAppState();
  return (
    <AppContext.Provider value={state}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
