'use client';

import { useState, ReactNode } from 'react';
import './CollapsibleSection.css';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  /** Extra class names applied to the inner content div */
  innerClassName?: string;
}

export default function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  innerClassName,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-section">
      <button
        className="collapsible-header"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <svg
          className={`collapsible-chevron${isOpen ? ' open' : ''}`}
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className={`collapsible-body${isOpen ? ' expanded' : ''}`}>
        <div className={`collapsible-inner${innerClassName ? ` ${innerClassName}` : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
