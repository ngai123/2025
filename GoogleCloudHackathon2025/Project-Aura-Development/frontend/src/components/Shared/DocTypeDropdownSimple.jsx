import React, { useEffect, useRef, useState, useMemo, useId } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { FiChevronDown } from 'react-icons/fi';

const Dropdown = styled.div`
  position: relative;
  width: 100%;
  max-width: 360px;
  z-index: 5;
`;

const Trigger = styled.button`
  width: 100%;
  height: 48px;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.06);
  padding: 0 25px;
  padding-left: ${({ $paddingLeft }) => $paddingLeft || '16px'};
  background: var(--color-bg-secondary);
  color: ${({ $isPlaceholder }) => ($isPlaceholder ? 'var(--color-text-secondary)' : 'var(--color-text-primary)')};
  font-size: 16px;
  font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: box-shadow 150ms ease, border-color 150ms ease;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 4px rgba(255,127,127,0.18);
    border-color: rgba(255,127,127,0.5);
  }

  @media (max-height: 700px) {
    height: 40px;
    font-size: 14px;
    padding: 0 20px;
    padding-left: ${({ $paddingLeft }) => $paddingLeft || '14px'};
  }
`;

const Menu = styled.ul`
  position: ${({ $portal }) => ($portal ? 'fixed' : 'absolute')};
  left: 0;
  width: 100%;
  margin: 0;
  padding: 8px 0;
  list-style: none;
  z-index: 3000;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.14);
  max-height: 240px;
  overflow-y: auto;
`;

const Item = styled.li`
  padding: 10px 14px;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;

  &:hover {
    background: #E2DDB4;
  }

  &[data-selected="true"] {
    color: var(--color-accent);
    font-weight: 600;
  }
`;

const LeftIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 60%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  pointer-events: none;
`;

export default function DocTypeDropdownSimple({
  value,
  onChange,
  options = [
    { value: 'passport', label: 'Passport' },
    { value: 'national-id', label: 'National ID' },
    { value: 'driving-license', label: 'Driving License' },
  ],
  placeholder = 'Select document',
  leftIcon = null,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const [placement, setPlacement] = useState('bottom');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const label = useMemo(
    () => options.find(o => o.value === value)?.label ?? placeholder,
    [options, value, placeholder]
  );
  const isPlaceholder = value === '' || label === placeholder;

  // Selection and active item tracking
  const selectedIndex = useMemo(() => {
    const idx = options.findIndex(o => o.value === value);
    return idx >= 0 ? idx : 0;
  }, [options, value]);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  const computePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vv = window.visualViewport;
    const viewportHeight = vv?.height || window.innerHeight;
    const viewportTop = vv?.offsetTop || 0;
    const viewportLeft = vv?.offsetLeft || 0;

    setCoords({ top: rect.top, left: rect.left + viewportLeft, width: rect.width, height: rect.height });
    const spaceBelow = viewportHeight - (rect.bottom - viewportTop);
    const spaceAbove = rect.top - viewportTop;
    const desired = 200; // approx menu height
    setPlacement(spaceBelow >= desired || spaceBelow >= spaceAbove ? 'bottom' : 'top');
  };

  useEffect(() => {
    if (open) {
      setActiveIndex(selectedIndex);
      // Focus menu and compute position
      requestAnimationFrame(() => {
        computePosition();
        menuRef.current?.focus();
      });
    }
  }, [open, selectedIndex]);

  // Close on outside click
  useEffect(() => {
    const onClickOutside = (e) => {
      if (!dropdownRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    const onScroll = () => {
      if (open) computePosition();
    };
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const openMenu = () => setOpen(true);
  const closeMenu = () => setOpen(false);

  const onTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openMenu();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(v => !v);
    }
  };

  const onMenuKeyDown = (e) => {
    const last = options.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i < last ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i > 0 ? i - 1 : last));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(last);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) {
        onChange(opt.value);
      }
      closeMenu();
      triggerRef.current?.focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      closeMenu();
      triggerRef.current?.focus();
    }
  };

  return (
    <Dropdown ref={dropdownRef}>
      {leftIcon && (
        <LeftIcon aria-hidden="true">{leftIcon}</LeftIcon>
      )}
      <Trigger
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        $isPlaceholder={isPlaceholder}
        $paddingLeft={leftIcon ? '40px' : undefined}
      >
        <span>{label}</span>
        <FiChevronDown size={18} color="var(--color-text-secondary)" style={{ marginLeft: '2px' }} />
      </Trigger>
      {open && (
        ReactDOM.createPortal(
          <Menu
            id={menuId}
            role="listbox"
            tabIndex={-1}
            ref={menuRef}
            aria-activedescendant={`${menuId}-opt-${activeIndex}`}
            onKeyDown={onMenuKeyDown}
            $placement={placement}
            $portal
            style={{
              left: coords.left,
              width: coords.width,
              ...(placement === 'top'
                ? { bottom: (window.visualViewport?.height || window.innerHeight) - coords.top + 6 }
                : { top: coords.top + coords.height + 6 }),
            }}
          >
            {options.map((o, i) => (
              <Item
                id={`${menuId}-opt-${i}`}
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                data-selected={o.value === value}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => {
                  onChange(o.value);
                  closeMenu();
                  triggerRef.current?.focus();
                }}
              >
                {o.label}
              </Item>
            ))}
          </Menu>,
          document.body
        )
      )}
    </Dropdown>
  );
}