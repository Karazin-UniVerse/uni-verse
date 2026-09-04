'use client';

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@uni-hub/views/LoginPage';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { ToastProvider } from '@ui/Toast';
import { isBrowser } from '@uni-hub/utils/browser';

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

  const isLoggedIn = isBrowser && localStorage.getItem('isLoggedIn') === 'true';

  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={isLoggedIn ? <DashboardPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/courses/:courseId/contents"
              element={isLoggedIn ? <CourseContents /> : <Navigate to="/login" replace />}
            />
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
