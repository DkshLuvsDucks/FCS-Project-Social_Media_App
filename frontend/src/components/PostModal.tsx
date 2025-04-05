import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDarkMode } from '../context/DarkModeContext';
import PostDetail from './PostDetail';

interface PostModalProps {
  postId: number | null;
  onClose: () => void;
  isVisible: boolean;
}

const PostModal: React.FC<PostModalProps> = ({ postId, onClose, isVisible }) => {
  const { darkMode } = useDarkMode();
  
  if (!postId) return null;
  
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-8 z-50 rounded-xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <PostDetail postId={postId} onClose={onClose} isModal={true} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PostModal; 