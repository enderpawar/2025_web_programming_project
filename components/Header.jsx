import React from 'react';
import ThemeToggleButton from './ThemeToggleButton.jsx';

const Header = () => {
  return (
    <header className="flex-shrink-0 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 shadow-lg p-3 px-4 md:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <h1 className="text-xl font-bold text-gray-100 tracking-wider">JS Online Compiler</h1>
        </div>
        
        <ThemeToggleButton />
      </div>
    </header>
  );
};

export default Header;
