import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NextcloudSetup } from './NextcloudSetup';
import { NextcloudDashboard } from './NextcloudDashboard';

export const NextcloudSection: React.FC = () => {
  const { state } = useApp();
  const [showSetup, setShowSetup] = useState(false);

  return (
    <>
      <NextcloudDashboard onOpenSetup={() => setShowSetup(true)} />
      
      <NextcloudSetup
        isOpen={showSetup}
        onClose={() => setShowSetup(false)}
      />
    </>
  );
}; 