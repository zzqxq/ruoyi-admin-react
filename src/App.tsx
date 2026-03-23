import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import KeepAliveLayout from './layouts/KeepAliveLayout';
import Login from './pages/Login';
import { RouteProvider } from './router/dynamic';
import { useUserStore } from '@/stores/user.ts';

const AuthRoute = ({children}: {children: React.ReactNode}) => {
  const token = useUserStore(state => state.token);
  const logout = useUserStore(state => state.logout)
  const location = useLocation()
  useEffect(() => {
    if (!token) {
      logout()
    }
  }, [logout, token]);

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  return children
}

const ProtectedWrapper = () => {
  return (
    <AuthRoute>
      <RouteProvider>
        <KeepAliveLayout />
      </RouteProvider>
    </AuthRoute>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<ProtectedWrapper />} />
      </Routes>
    </Router>
  );
}

export default App;
