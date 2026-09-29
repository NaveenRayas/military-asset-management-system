import React from 'react';

const Badge = ({ variant = 'default', children, className = '' }) => {
  const variantStyles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    primary: 'bg-sky-950 text-sky-300 border-sky-800',
    success: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    warning: 'bg-amber-950 text-amber-300 border-amber-800',
    danger: 'bg-rose-950 text-rose-300 border-rose-800',
    purple: 'bg-indigo-950 text-indigo-300 border-indigo-800',
  };

  // Helper matching based on text
  let styleKey = variant;
  if (typeof children === 'string') {
    const val = children.toUpperCase();
    if (['ADMIN', 'COMPLETED', 'ACTIVE', 'VEHICLE'].includes(val)) {
      styleKey = variant === 'default' ? 'success' : variant;
    } else if (['BASE_COMMANDER', 'PENDING', 'WEAPON', 'AMMUNITION'].includes(val)) {
      styleKey = variant === 'default' ? 'warning' : variant;
    } else if (['CANCELLED', 'EXPENDED'].includes(val)) {
      styleKey = variant === 'default' ? 'danger' : variant;
    } else if (['LOGISTICS_OFFICER', 'COMMUNICATION', 'RETURNED'].includes(val)) {
      styleKey = variant === 'default' ? 'primary' : variant;
    } else if (['PROTECTIVE EQUIPMENT', 'PROTECTIVE'].includes(val)) {
      styleKey = variant === 'default' ? 'purple' : variant;
    }
  }

  const finalStyle = variantStyles[styleKey] || variantStyles.default;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold font-mono tracking-wide uppercase border ${finalStyle} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
