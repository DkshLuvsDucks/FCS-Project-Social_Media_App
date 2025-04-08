import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import CreatePost from './pages/CreatePost';
import PostDetailPage from './pages/PostDetailPage';
import Marketplace from './pages/Marketplace';
import { AuthProvider } from './context/AuthContext';
import { DarkModeProvider } from './context/DarkModeContext';
import PrivateRoute from './components/PrivateRoute';
import ComingSoon from './components/ComingSoon';
import { VideoMuteProvider, CurrentVideoProvider } from './components/PostCard';

function App() {
  const location = useLocation();

  return (
    <DarkModeProvider>
      <AuthProvider>
        <VideoMuteProvider>
          <CurrentVideoProvider>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<Navigate to="/home" />} />
                
                <Route element={<PrivateRoute />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/notifications" element={<ComingSoon pageName="Notifications" />} />
                  <Route path="/create" element={<CreatePost />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/profile/:username" element={<Profile />} />
                  <Route path="/profile/edit" element={<EditProfile />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/post/:id" element={<PostDetailPage />} />
                </Route>
              </Routes>
            </AnimatePresence>
            <Toaster position="top-center" />
          </CurrentVideoProvider>
        </VideoMuteProvider>
      </AuthProvider>
    </DarkModeProvider>
  );
}

export default App;