import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  formatThousandDigits,
  parseThousandDigits,
} from '../utils/formatters';

interface ThousandInputProps {
  value: number | string;
  onValueChange: (rawDigits: string, numericValue: number) => void;
  allowNegative?: boolean;
  allowZero?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

export const ThousandInput: React.FC<ThousandInputProps> = ({
  value,
  onValueChange,
  allowNegative = false,
  allowZero = false,
  required = false,
  placeholder = '0',
  className = '',
  ariaLabel,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nextCaretRef = useRef<number | null>(null);

  const deriveDisplay = (val: number | string): string => {
    if (val === '' || val === null || val === undefined) return '';
    const num =
      typeof val === 'number' ? val : parseThousandDigits(String(val));
    if (num === 0) return allowZero ? '0' : '';
    return formatThousandDigits(num);
  };

  const [display, setDisplay] = useState<string>(() => deriveDisplay(value));

  useEffect(() => {
    const incomingEmpty =
      value === '' ||
      value === null ||
      value === undefined ||
      (!allowZero && Number(value) === 0);

    if (incomingEmpty) {
      if (display !== '' && display !== '-') {
        setDisplay('');
      }
      return;
    }

    const incomingNum =
      typeof value === 'number' ? value : parseThousandDigits(String(value));
    const currentNum = parseThousandDigits(display);

    if (display === '' && incomingNum === 0 && allowZero) {
      // Allow user to keep input temporarily blank while editing
      return;
    }

    if (incomingNum !== currentNum || formatThousandDigits(incomingNum) !== display) {
      setDisplay(deriveDisplay(value));
    }
  }, [value, allowZero]);

  useLayoutEffect(() => {
    if (nextCaretRef.current !== null && inputRef.current) {
      const pos = Math.min(nextCaretRef.current, display.length);
      inputRef.current.setSelectionRange(pos, pos);
      nextCaretRef.current = null;
    }
  }, [display]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;

    const isNeg = allowNegative && raw.trim().startsWith('-');
    const digitsBeforeCaret = raw
      .slice(0, caret)
      .replace(/[^\d]/g, '').length;

    const cleanDigits = raw.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');

    if (!cleanDigits) {
      const nextDisp = isNeg ? '-' : '';
      setDisplay(nextDisp);
      nextCaretRef.current = nextDisp.length;
      onValueChange('', 0);
      return;
    }

    const formatted = formatThousandDigits(
      isNeg ? `-${cleanDigits}` : cleanDigits
    );

    // Map digit count before caret back to position in formatted string
    let seenDigits = 0;
    let newPos = isNeg ? 1 : 0;
    if (digitsBeforeCaret > 0) {
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          seenDigits++;
          if (seenDigits === digitsBeforeCaret) {
            newPos = i + 1;
            break;
          }
        }
      }
      if (seenDigits < digitsBeforeCaret) {
        newPos = formatted.length;
      }
    }

    nextCaretRef.current = newPos;
    setDisplay(formatted);
    const numeric = parseThousandDigits(formatted);
    onValueChange(isNeg ? `-${cleanDigits}` : cleanDigits, numeric);
  };

  const handleBlur = () => {
    if (display === '' || display === '-') {
      if (allowZero) {
        setDisplay('0');
        onValueChange('0', 0);
      } else {
        setDisplay('');
        onValueChange('', 0);
      }
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode={allowNegative ? 'text' : 'numeric'}
      required={required}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={className}
    />
  );
};
