// Shared UI Components
import React from 'react';


export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
}) {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-pure-green text-black hover:bg-pure-accent-light font-semibold',
    secondary: 'bg-white text-coastal-day hover:bg-gray-100 border border-coastal-search',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  className = '',
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-pure-ink mb-1">
        {label}
        {required && <span className="text-red-700 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 bg-white border border-coastal-search text-pure-ink placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-pure-accent-ink/40 focus:border-pure-accent-ink"
      />
    </div>
  );
}

export function TimeInput({
  label,
  value,
  onChange,
  required = false,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  // Parse current value or set defaults
  const [hour, minute] = value ? value.split(':') : ['12', '00'];

  // Set initial value if empty
  React.useEffect(() => {
    if (!value) {
      onChange('12:00');
    }
  }, []);

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${minute || '00'}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${hour || '12'}:${newMinute}`);
  };

  // Generate hours (00-23 for 24-hour format)
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  
  // Generate minutes in 15-minute intervals
  const minutes = ['00', '15', '30', '45'];

  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-pure-ink mb-1">
        {label}
        {required && <span className="text-red-700 ml-1">*</span>}
      </label>
      <div className="flex gap-2">
        <select
          value={hour}
          onChange={(e) => handleHourChange(e.target.value)}
          required={required}
          className="flex-1 px-3 py-2 bg-white border border-coastal-search text-pure-ink rounded-lg focus:outline-none focus:ring-2 focus:ring-pure-accent-ink/40 focus:border-pure-accent-ink"
        >
          {hours.map((h) => (
            <option key={h} value={h} className="bg-white text-pure-ink">
              {h}
            </option>
          ))}
        </select>
        <span className="text-pure-ink text-2xl flex items-center">:</span>
        <select
          value={minute}
          onChange={(e) => handleMinuteChange(e.target.value)}
          required={required}
          className="flex-1 px-3 py-2 bg-white border border-coastal-search text-pure-ink rounded-lg focus:outline-none focus:ring-2 focus:ring-pure-accent-ink/40 focus:border-pure-accent-ink"
        >
          {minutes.map((m) => (
            <option key={m} value={m} className="bg-white text-pure-ink">
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className = '',
  textareaClassName = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  /** Extra classes on the textarea (e.g. min-height for long descriptions) */
  textareaClassName?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-pure-ink mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 bg-white border border-coastal-search text-pure-ink placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-pure-accent-ink/40 focus:border-pure-accent-ink ${textareaClassName}`}
      />
    </div>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-pure-surface text-pure-ink rounded-lg border border-gray-300 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-4px_rgba(16,24,40,0.10)] p-6 ${className}`}>
      {children}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-pure-bg">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pure-green"></div>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4">
      {message}
    </div>
  );
}

export function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="bg-pure-green/20 border border-pure-accent-ink/40 text-pure-accent-ink px-4 py-3 rounded-lg mb-4">
      {message}
    </div>
  );
}
