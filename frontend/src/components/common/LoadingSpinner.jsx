import React from 'react';
import { Loader2, Package } from 'lucide-react';

const LoadingSpinner = ({ 
  size = 'default', 
  message = 'Loading...', 
  fullscreen = false,
  overlay = false,
  color = 'blue',
  variant = 'spin'
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    default: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16',
  };

  const colorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
    red: 'text-red-500',
    orange: 'text-orange-500',
    gray: 'text-gray-500',
    white: 'text-white',
  };

  const containerClasses = fullscreen 
    ? 'fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50'
    : overlay
    ? 'absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    : 'flex items-center justify-center p-4';

  const SpinnerIcon = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className={`w-2 h-2 ${colorClasses[color].replace('text-', 'bg-')} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
            <div className={`w-2 h-2 ${colorClasses[color].replace('text-', 'bg-')} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
            <div className={`w-2 h-2 ${colorClasses[color].replace('text-', 'bg-')} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
          </div>
        );
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} ${colorClasses[color].replace('text-', 'bg-')} rounded-full animate-pulse`}></div>
        );
      case 'custom':
        return (
          <Package className={`${sizeClasses[size]} ${colorClasses[color]} animate-bounce`} />
        );
      default:
        return (
          <Loader2 className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`} />
        );
    }
  };

  if (fullscreen) {
    return (
      <div className={containerClasses}>
        <div className="text-center">
          <SpinnerIcon />
          {message && (
            <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg font-medium">
              {message}
            </p>
          )}
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-500">
            Please wait...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <SpinnerIcon />
        {message && size !== 'small' && (
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

// Inline spinner for buttons
export const InlineSpinner = ({ size = 'small', color = 'white' }) => (
  <Loader2 className={`${
    size === 'small' ? 'w-4 h-4' : 'w-5 h-5'
  } ${
    color === 'white' ? 'text-white' : 'text-gray-500'
  } animate-spin`} />
);

// Page loading component
export const PageLoader = ({ message = 'Loading page...' }) => (
  <LoadingSpinner 
    fullscreen 
    size="large" 
    message={message}
    variant="spin"
    color="blue"
  />
);

// Overlay loader for modals/forms
export const OverlayLoader = ({ message = 'Processing...' }) => (
  <LoadingSpinner 
    overlay 
    size="large" 
    message={message}
    variant="spin"
    color="white"
  />
);

// Table loading state
export const TableLoader = ({ rows = 5, columns = 4 }) => (
  <div className="animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center p-4 space-x-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// Card loading state
export const CardLoader = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    ))}
  </div>
);

// Chart loading state
export const ChartLoader = ({ height = 300 }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div className="animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
      <div 
        className="bg-gray-200 dark:bg-gray-700 rounded"
        style={{ height: `${height}px` }}
      ></div>
    </div>
  </div>
);

// Skeleton text loader
export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`animate-pulse space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div 
        key={i}
        className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${
          i === lines - 1 ? 'w-3/4' : 'w-full'
        }`}
      ></div>
    ))}
  </div>
);

// Loading state for lists
export const ListLoader = ({ items = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg animate-pulse">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
        <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded"></div>
      </div>
    ))}
  </div>
);

export default LoadingSpinner;
