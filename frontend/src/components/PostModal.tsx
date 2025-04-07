import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDarkMode } from '../context/DarkModeContext';
import PostDetail from './PostDetail';
import { useCurrentVideo } from './PostCard';

interface PostModalProps {
  postId: number | null;
  onClose: () => void;
  isVisible: boolean;
}

const PostModal: React.FC<PostModalProps> = ({ postId, onClose, isVisible }) => {
  const { darkMode } = useDarkMode();
  const [isMobile, setIsMobile] = useState(false);
  const { setCurrentPlayingId } = useCurrentVideo();
  
  // Check window size on load and resize
  useEffect(() => {
    const checkWindowSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkWindowSize();
    
    // Add resize listener
    window.addEventListener('resize', checkWindowSize);
    
    // Lock body scroll when modal is open
    if (isVisible) {
      document.body.style.overflow = 'hidden';
      
      // Pause ALL videos in the background to ensure only the modal plays
      document.querySelectorAll('video').forEach(video => {
        if (video instanceof HTMLVideoElement && !video.closest('.PostDetail')) {
          video.pause();
        }
      });
    }
    
    // Clean up
    return () => {
      window.removeEventListener('resize', checkWindowSize);
      document.body.style.overflow = '';
    };
  }, [isVisible]);
  
  // Handle closing the modal - reset current playing ID
  const handleClose = () => {
    // Reset current playing ID when closing to allow background videos to play again
    setCurrentPlayingId(null);
    onClose();
  };
  
  if (!postId) return null;
  
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            onClick={handleClose}
          />
          
          {/* Modal container */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`overflow-hidden shadow-xl rounded-xl ${darkMode ? 'border border-gray-700' : 'border border-gray-200'}`}
              style={{
                width: isMobile ? '100%' : 'min(1100px, 80vw)',
                height: isMobile ? '100%' : 'min(750px, 80vh)',
                backgroundColor: darkMode ? 'rgb(31 41 55)' : 'white',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <PostDetail postId={postId} onClose={handleClose} isModal={true} />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PostModal; 