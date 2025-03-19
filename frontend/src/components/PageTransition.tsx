import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import DarkModeToggle from './DarkModeToggle';

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const { darkMode } = useDarkMode();

  return (
    <div 
      className="fixed inset-0 w-full"
      style={{
        background: darkMode 
          ? 'linear-gradient(to bottom, rgb(17 24 39), rgb(31 41 55))'
          : 'linear-gradient(to bottom, rgb(243 244 246), rgb(229 231 235))',
        minHeight: '100vh'
      }}
    >
      {/* Fixed Dark Mode Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <DarkModeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          type: "tween",
          ease: "easeInOut",
          duration: 0.3
        }}
        className="min-h-screen w-full py-8 px-4 flex items-center justify-center overflow-y-auto"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ 
            duration: 0.2,
            ease: "easeInOut"
          }}
          className="w-full"
          style={{ maxWidth: '28rem' }}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PageTransition; 