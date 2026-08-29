'use client';

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './views/LoginPage';
import DashboardPage from './views/DashboardPage';
import CourseContents from './views/CourseContents';
import { ThemeProvider } from './theme/ThemeContext';
import { ToastProvider } from './components/ui/Toast';

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
