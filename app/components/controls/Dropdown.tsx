'use client';

import { useState, useRef, useEffect } from 'react';

/* ── Option type ── */
export interface DropdownOption {
  label: string;
  value: string;
}

/* ── Props ── */
interface DropdownBaseProps {
  /** Text displayed on the trigger button */
  displayText: string;
  /** List of selectable options */
  options: DropdownOption[];
  /**
   * Trigger style variant:
   * - 'default': uses the multiselect-trigger style (for top-row controls)
   * - 'compact': uses the btn-preset button style (for date nav groups)
   */
  variant?: 'default' | 'compact';
}

interface SingleSelectDropdownProps extends DropdownBaseProps {
  mode: 'single';
  selected: string;
  onChange: (value: string) => void;
}

interface MultiSelectDropdownProps extends DropdownBaseProps {
  mode: 'multi';
  selected: string[];
  onChange: (values: string[]) => void;
  /**
   * When true, the dropdown starts in single-select mode.
   * An "Enable Multi" toggle in the actions bar lets the user
   * switch to full multi-select (with Select All / Clear).
   */
  allowMultiToggle?: boolean;
}

export type DropdownProps = SingleSelectDropdownProps | MultiSelectDropdownProps;

export default function Dropdown(props: DropdownProps) {
  const { displayText, options, variant = 'default', mode } = props;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allowMultiToggle = mode === 'multi' && (props as MultiSelectDropdownProps).allowMultiToggle;
  const [multiEnabled, setMultiEnabled] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isSelected = (val: string) =>
    mode === 'multi'
      ? (props as MultiSelectDropdownProps).selected.includes(val)
      : (props as SingleSelectDropdownProps).selected === val;

  const handleOptionClick = (val: string) => {
    if (mode === 'single') {
      (props as SingleSelectDropdownProps).onChange(val);
      setOpen(false);
    } else {
      const multi = props as MultiSelectDropdownProps;
      if (allowMultiToggle && !multiEnabled) {
        // Single-select behavior: replace selection with just this value
        multi.onChange([val]);
        setOpen(false);
      } else {
        // Full multi-select behavior: toggle the value
        const current = multi.selected;
        multi.onChange(
          current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
        );
      }
    }
  };

  const allValues = options.map((o) => o.value);
  const isMultiBehavior = mode === 'multi' && (!allowMultiToggle || multiEnabled);

  /* ── Trigger ── */
  const trigger =
    variant === 'compact' ? (
      <button
        className={`btn-preset ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        style={{ width: '100%', justifyContent: 'space-between' }}
      >
        <span style={{ color: 'var(--text-primary)' }}>{displayText}</span>
        <span className="arrow" style={{ fontSize: '0.8em', marginLeft: '6px' }}>▼</span>
      </button>
    ) : (
      <div
        className={`multiselect-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span>{displayText}</span>
        <span className="arrow">▼</span>
      </div>
    );

  return (
    <div className="multiselect" ref={ref} style={variant === 'compact' ? { width: '100%' } : undefined}>
      {trigger}
      {open && (
        <div className="multiselect-dropdown" style={variant === 'compact' ? { minWidth: '180px' } : undefined}>
          {mode === 'multi' && (
            <div className="multiselect-actions">
              {allowMultiToggle && (
                <button
                  onClick={() => setMultiEnabled(!multiEnabled)}
                  style={{
                    color: multiEnabled ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                    fontWeight: multiEnabled ? '700' : '600',
                  }}
                >
                  {multiEnabled ? 'X' : 'Enable Multi-Select'}
                </button>
              )}
              {isMultiBehavior && (
                <>
                  <button onClick={() => (props as MultiSelectDropdownProps).onChange([...allValues])}>
                    Select All
                  </button>
                  <button onClick={() => (props as MultiSelectDropdownProps).onChange([])}>
                    Clear
                  </button>
                </>
              )}
            </div>
          )}
          {options.map((opt) => (
            <div
              key={opt.value}
              className="multiselect-option"
              onClick={() => handleOptionClick(opt.value)}
              style={{
                fontWeight: isSelected(opt.value) ? '600' : 'normal',
                color: isSelected(opt.value) ? 'var(--accent-indigo)' : 'inherit',
              }}
            >
              {isMultiBehavior && (
                <input type="checkbox" checked={isSelected(opt.value)} hidden readOnly />
              )}
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
