import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Messages from './pages/Messages';
import { AuthProvider } from './context/AuthContext';
import { DarkModeProvider } from './context/DarkModeContext';
import PrivateRoute from './components/PrivateRoute';
import ComingSoon from './components/ComingSoon';

function App() {
  const location = useLocation();

  return (
    <DarkModeProvider>
      <AuthProvider>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Navigate to="/home" />} />
            
            <Route element={<PrivateRoute />}>
              <Route path="/home" element={<Home />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/notifications" element={<ComingSoon pageName="Notifications" />} />
              <Route path="/create" element={<ComingSoon pageName="Create Post" />} />
              <Route path="/profile" element={<ComingSoon pageName="Profile" />} />
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Routes>
        </AnimatePresence>
      </AuthProvider>
    </DarkModeProvider>
  );
}

export default App;