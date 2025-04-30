import React from 'react';
import './Select.scss';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  testId?: string;
}

export const Select: React.FC<SelectProps> = ({
  id,
  value,
  options,
  onChange,
  label,
  className = '',
  testId,
}) => {
  return (
    <div className="select-wrapper">
      {label && (
        <label htmlFor={id} className="select-label">
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`select-input ${className}`}
        data-testid={testId}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}; 