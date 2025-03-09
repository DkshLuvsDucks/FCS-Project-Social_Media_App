import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';

const DarkModeToggle: React.FC = () => {
  const { darkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className={`p-2 rounded-lg transition-colors duration-200 ${
        darkMode 
          ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
      aria-label="Toggle dark mode"
    >
      {darkMode ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

export default DarkModeToggle;
