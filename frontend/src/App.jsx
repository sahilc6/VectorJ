import React from 'react';
import { AppProvider } from './contexts/AppContext';
import Header from './components/layout/Header';
import LeftPanel from './components/layout/LeftPanel';
import CenterPanel from './components/layout/CenterPanel';
import RightPanel from './components/layout/RightPanel';
import Tooltip from './components/ui/Tooltip';

export default function App() {
  return (
    <AppProvider>
      <Header />
      <div className="layout">
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </div>
      <Tooltip />
    </AppProvider>
  );
}
