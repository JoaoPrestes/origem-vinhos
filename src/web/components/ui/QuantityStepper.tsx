import React from 'react';

interface QuantityStepperProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
}) => {
  const handleDecrement = () => {
    if (value > min && !disabled) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max && !disabled) {
      onChange(value + 1);
    }
  };

  return (
    <div className="quantity-stepper" role="group" aria-label="Controle de quantidade">
      <button
        type="button"
        className="stepper-btn"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        aria-label="Diminuir quantidade"
      >
        −
      </button>
      <span className="stepper-value" aria-live="polite">{value}</span>
      <button
        type="button"
        className="stepper-btn"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        aria-label="Aumentar quantidade"
      >
        +
      </button>
    </div>
  );
};
