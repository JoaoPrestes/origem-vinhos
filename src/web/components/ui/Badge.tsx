import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'wine' | 'gold' | 'admin' | 'secondary' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'wine',
  className = '',
  ...props
}) => {
  const variantClass = `badge-${variant}`;
  const combinedClassName = `badge ${variantClass} ${className}`.trim();

  return (
    <span className={combinedClassName} {...props}>
      {children}
    </span>
  );
};
