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
    primary: 'bg-pure-green text-black hover:bg-lime-400 font-semibold',
    secondary: 'bg-coastal-sky text-pure-white hover:bg-coastal-search border border-coastal-day',
    danger: 'bg-red-600 text-pure-white hover:bg-red-700',
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
      <label className="block text-sm font-medium text-pure-white mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 bg-pure-dark border border-coastal-search text-pure-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-coastal-sky [color-scheme:dark]"
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
      <label className="block text-sm font-medium text-pure-white mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex gap-2">
        <select
          value={hour}
          onChange={(e) => handleHourChange(e.target.value)}
          required={required}
          className="flex-1 px-3 py-2 bg-pure-dark border border-coastal-search text-pure-white rounded-lg focus:outline-none focus:ring-2 focus:ring-coastal-sky"
        >
          {hours.map((h) => (
            <option key={h} value={h} className="bg-pure-dark text-pure-white">
              {h}
            </option>
          ))}
        </select>
        <span className="text-pure-white text-2xl flex items-center">:</span>
        <select
          value={minute}
          onChange={(e) => handleMinuteChange(e.target.value)}
          required={required}
          className="flex-1 px-3 py-2 bg-pure-dark border border-coastal-search text-pure-white rounded-lg focus:outline-none focus:ring-2 focus:ring-coastal-sky"
        >
          {minutes.map((m) => (
            <option key={m} value={m} className="bg-pure-dark text-pure-white">
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-pure-white mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 bg-pure-dark border border-coastal-search text-pure-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-coastal-sky"
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
    <div className={`bg-pure-gray text-pure-white rounded-lg shadow-lg border border-coastal-search p-6 ${className}`}>
      {children}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-pure-dark">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pure-green"></div>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-900/30 border border-red-600/50 text-red-300 px-4 py-3 rounded-lg mb-4">
      {message}
    </div>
  );
}

export function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="bg-coastal-day/20 border border-coastal-sky text-coastal-day px-4 py-3 rounded-lg mb-4">
      {message}
    </div>
  );
}
