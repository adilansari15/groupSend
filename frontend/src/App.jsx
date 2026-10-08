import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { GroupProvider } from './context/GroupContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import BottomNav from './components/BottomNav.jsx';
import CreateGroupModal from './components/CreateGroupModal.jsx';
import AddExpenseModal from './components/AddExpenseModal.jsx';
import SettleNowModal from './components/SettleNowModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import RouteLoadingSkeleton from './components/RouteLoadingSkeleton.jsx';
import { api } from './api.js';

// Route-based code splitting with React.lazy
const Home = React.lazy(() => import('./pages/Home.jsx'));
const Expenses = React.lazy(() => import('./pages/Expenses.jsx'));
const Reports = React.lazy(() => import('./pages/Reports.jsx'));
const Members = React.lazy(() => import('./pages/Members.jsx'));
const Settlements = React.lazy(() => import('./pages/Settlements.jsx'));
const JoinGroup = React.lazy(() => import('./pages/JoinGroup.jsx'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail.jsx'));
const Chat = React.lazy(() => import('./pages/Chat.jsx'));
const Activity = React.lazy(() => import('./pages/Activity.jsx'));
const NotFound = React.lazy(() => import('./pages/NotFound.jsx'));

export default function App() {
  const [isWakingUp, setIsWakingUp] = useState(false);

  // Background Render cold-start ping
  useEffect(() => {
    let timer = setTimeout(() => {
      setIsWakingUp(true);
    }, 2800);

    api.health()
      .then(() => {
        clearTimeout(timer);
        setIsWakingUp(false);
      })
      .catch(() => {
        // Ping error (server still spinning up or offline)
      });

    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <GroupProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>

            <div className="app-container">
              <Sidebar />

              <main id="main-content" className="main-content" tabIndex="-1">
                <Header />

                {isWakingUp && (
                  <div className="server-status-banner" role="status" aria-live="polite">
                    <div className="server-status-pill">
                      <span className="server-status-pulse" />
                      Waking up server
                    </div>
                    <span>Render free tier instance is spinning up (~30s). Thank you for your patience!</span>
                  </div>
                )}

                <ErrorBoundary>
                  <Suspense fallback={<RouteLoadingSkeleton />}>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/expenses" element={<Expenses />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/members" element={<Members />} />
                      <Route path="/settlements" element={<Settlements />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/activity" element={<Activity />} />
                      <Route path="/join/:id" element={<JoinGroup />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </main>

              <BottomNav />

              {/* Global Modals */}
              <CreateGroupModal />
              <AddExpenseModal />
              <SettleNowModal />
              <AuthModal />
            </div>
          </BrowserRouter>
        </GroupProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
