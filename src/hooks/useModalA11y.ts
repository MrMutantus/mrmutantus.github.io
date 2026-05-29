import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(el => !el.hasAttribute('hidden') && el.offsetParent !== null);
}

// Wires modal a11y onto a ref'd container:
// - Escape closes the modal.
// - Tab/Shift+Tab cycles focus within the modal (focus trap).
// - On mount, focus the first focusable inside the modal unless React's
//   autoFocus already moved focus there.
// - On unmount, restore focus to whatever was focused before the modal opened.
export function useModalA11y(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = ref.current;

    if (root && !root.contains(document.activeElement)) {
      const focusable = getFocusable(root);
      focusable[0]?.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !root) return;
      const focusable = getFocusable(root);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!first || !last) return;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  return ref;
}
