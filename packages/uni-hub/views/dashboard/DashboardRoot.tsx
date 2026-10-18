'use client';

import React from 'react';
import { DashboardProvider } from './DashboardContext';
import { DashboardShell } from './layout/DashboardShell';

export const DashboardRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DashboardProvider>
    <DashboardShell>{children}</DashboardShell>
  </DashboardProvider>
);
