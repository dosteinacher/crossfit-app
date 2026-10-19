// Shared UI Components
import React from 'react';


export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
  ...buttonProps
}: {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger';
  className?: string;
  disabled?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick' | 'type' | 'disabled'>) {
  const baseClasses = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-4 py-2 text-[15px] font-bold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15 disabled:cursor-not-allowed disabled:opacity-50';
  
  const variantClasses = {
    primary: 'bg-lime text-ink hover:brightness-95',
    dark: 'bg-ink text-white hover:bg-ink-2',
    secondary: 'border border-line bg-paper text-ink hover:bg-canvas',
    ghost: 'bg-transparent text-ink-2 hover:bg-canvas',
    danger: 'bg-transparent text-danger hover:bg-canvas',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...buttonProps}
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
        className="min-h-11 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
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
          className="min-h-11 flex-1 rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
        >
          {hours.map((h) => (
            <option key={h} value={h} className="bg-white text-pure-ink">
              {h}
            </option>
          ))}
        </select>
        <span         className="flex items-center text-2xl text-ink">:</span>
        <select
          value={minute}
          onChange={(e) => handleMinuteChange(e.target.value)}
          required={required}
          className="min-h-11 flex-1 rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
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
        className={`w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15 ${textareaClassName}`}
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
    <div className={`rounded-lg border border-line bg-paper p-6 text-ink ${className}`}>
      {children}
    </div>
  );
}

export function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-sans text-[13px] font-bold uppercase tracking-[.14em] text-ink-2 ${className}`}>
      {children}
    </span>
  );
}

export function CapacityBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const segmentCount = Math.max(0, Math.floor(max));
  const filledCount = Math.min(segmentCount, Math.max(0, Math.floor(value)));
  const isFull = segmentCount > 0 && filledCount >= segmentCount;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} aria-label={`${filledCount} of ${segmentCount} spots filled`}>
      <span className="inline-flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: segmentCount }, (_, index) => (
          <span
            key={index}
            className={`h-2 w-4 rounded-[2px] ${index < filledCount ? (isFull ? 'bg-[#9A9D94]' : 'bg-ink') : 'bg-line'}`}
          />
        ))}
      </span>
      <span className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{filledCount}/{segmentCount}</span>
    </div>
  );
}

export function StatusAction({
  status,
  onJoin,
  onUnregister,
  waitlist = false,
  disabled = false,
  className = '',
}: {
  status: 'registered' | 'open' | 'full';
  onJoin?: () => void;
  onUnregister?: () => void;
  waitlist?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  if (status === 'registered') {
    return (
      <button
        type="button"
        onClick={onUnregister}
        disabled={disabled}
        className={`inline-flex min-h-11 items-center justify-center rounded-full bg-lime px-3 py-2 text-sm font-bold text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        ✓ You&apos;re in
      </button>
    );
  }

  if (status === 'open') {
    return <Button variant="dark" onClick={onJoin} disabled={disabled} className={className}>Join</Button>;
  }

  return (
    <span className={`inline-flex min-h-11 items-center justify-center rounded-sm border border-dashed border-line px-3 py-2 text-sm font-semibold text-ink-2 ${className}`}>
      {waitlist ? 'Full · Waitlist' : 'Full'}
    </span>
  );
}

export function Badge({
  children,
  variant = 'neutral',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'neutral' | 'dark' | 'outline' | 'lime';
  className?: string;
}) {
  const variants = {
    neutral: 'bg-canvas text-ink-2',
    dark: 'bg-ink text-white',
    outline: 'border border-line bg-paper text-ink',
    lime: 'bg-lime text-ink',
  };

  return (
    <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-[13px] font-bold uppercase tracking-wide ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function Avatar({ initials, className = '' }: { initials: string; className?: string }) {
  return (
    <span
      aria-label={initials}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-lime ${className}`}
    >
      {initials}
    </span>
  );
}

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className = '',
}: {
  items: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex w-max max-w-full gap-1 overflow-x-auto rounded-sm bg-line p-[3px] ${className}`}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
            className={`min-h-10 shrink-0 whitespace-nowrap rounded-[7px] px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15 ${
              selected ? 'bg-paper text-ink shadow-sm' : 'bg-transparent text-ink-2 hover:text-ink'
            }`}
          >
            {item.label}
          </button>
        );
      })}
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
    <div className="mb-4 rounded-lg border border-line bg-paper px-4 py-3 text-ink-2">
      {message}
    </div>
  );
}

export function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-lg border border-line bg-paper px-4 py-3 text-ink-2">
      {message}
    </div>
  );
}
