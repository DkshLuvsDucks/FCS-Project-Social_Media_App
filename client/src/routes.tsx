import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load components
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Home = React.lazy(() => import('./pages/Home'));
const Messages = React.lazy(() => import('./pages/Messages'));
const Admin = React.lazy(() => import('./pages/Admin'));
const PrivateRoute = React.lazy(() => import('./components/PrivateRoute'));

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      <div className="mt-4">Loading...</div>
    </div>
  </div>
);

const AppRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
            
            {/* Protected Routes */}
            <Route 
              path="/home" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <PrivateRoute>
                    <Home />
                  </PrivateRoute>
                </Suspense>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <PrivateRoute requireAdmin>
                    <Admin />
                  </PrivateRoute>
                </Suspense>
              } 
            />
            <Route 
              path="/messages" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <PrivateRoute>
                    <Messages />
                  </PrivateRoute>
                </Suspense>
              } 
            />
            
            {/* Coming Soon Routes */}
            <Route 
              path="/notifications" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <PrivateRoute>
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-xl">Notifications (Coming Soon)</div>
                    </div>
                  </PrivateRoute>
                </Suspense>
              } 
            />
            <Route 
              path="/create" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <PrivateRoute>
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-xl">Create Post (Coming Soon)</div>
                    </div>
                  </PrivateRoute>
                </Suspense>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <PrivateRoute>
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-xl">Profile (Coming Soon)</div>
                    </div>
                  </PrivateRoute>
                </Suspense>
              } 
            />

            {/* Catch all route */}
            <Route 
              path="*" 
              element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-xl">404 - Page Not Found</div>
                </div>
              } 
            />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </ErrorBoundary>
  );
};

export default AppRoutes; 