import './Toggle.scss';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  'data-testid'?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, 'data-testid': testId }) => {
  const id = label ? `toggle-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined;

  return (
    <div className="toggle">
      {label && <label htmlFor={id} className="toggle__label">{label}</label>}
      <label className="toggle__input" htmlFor={id}>
        <input 
          id={id}
          type="checkbox" 
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          data-testid={testId}
        />
        <div className="toggle__input-track" />
      </label>
    </div>
  );
}; 