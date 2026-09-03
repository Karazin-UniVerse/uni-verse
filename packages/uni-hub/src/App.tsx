'use client';

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './views/LoginPage';
import { ThemeProvider } from './theme/ThemeContext';
import { ToastProvider } from './components/ui/Toast';

// Placeholder views for subsequent feature stacks (stack-8: CourseContents, stack-10: DashboardPage)
const DashboardPage: React.FC = () => <div style={{ padding: '24px' }}>Dashboard</div>;
const CourseContents: React.FC = () => <div style={{ padding: '24px' }}>Course Contents</div>;

const App: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true';

  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/courses/:courseId/contents" element={<CourseContents />} />
            <Route
              path="/"
              element={<Navigate to={isLoggedIn ? '/dashboard' : '/login'} replace />}
            />
          </Routes>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
