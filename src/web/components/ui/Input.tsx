import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const inputClassName = `input-field ${error ? 'input-error' : ''} ${className}`.trim();

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <div className="input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span style={{ position: 'absolute', left: '12px', color: 'var(--color-text-secondary)', display: 'inline-flex' }}>
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={inputClassName}
          style={icon ? { paddingLeft: '40px' } : undefined}
          {...props}
        />
      </div>
      {error && <p className="input-error-msg">{error}</p>}
      {!error && helperText && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';
