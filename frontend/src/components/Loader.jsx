import React from 'react';

const Loader = ({ loading = false }) => {
  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      {/* Animated spinner */}
      <div className="relative">
        {/* Outer ring with gradient */}
        <div className="w-16 h-16 border-4 border-gray-300 rounded-full animate-spin border-t-transparent bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-border"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-spin border-t-orange-500"></div>
        
        {/* Inner pulsing dot */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-3 h-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {/* Loading text */}
      <div className="absolute mt-24">
        <p className="text-gray-800 text-lg font-medium animate-pulse">Loading...</p>
      </div>
    </div>
  );
};

export default Loader;