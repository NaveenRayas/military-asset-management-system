import React from 'react';

const LoadingSpinner = ({ size = 'md', text = 'Loading data...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
      <div
        className={`${sizeClasses[size] || sizeClasses.md} rounded-full border-slate-700 border-t-sky-500 animate-spin`}
      />
      {text && <p className="text-xs tracking-wider uppercase text-slate-400 font-mono">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
