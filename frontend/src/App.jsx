import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

import Home from './pages/Home.jsx';
import Expenses from './pages/Expenses.jsx';
import Reports from './pages/Reports.jsx';
import Members from './pages/Members.jsx';
import Settlements from './pages/Settlements.jsx';
import JoinGroup from './pages/JoinGroup.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import Chat from './pages/Chat.jsx';
import Activity from './pages/Activity.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GroupProvider>
          <BrowserRouter>
            <div className="app-container">
              <Sidebar />

              <main className="main-content">
                <Header />
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
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
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
