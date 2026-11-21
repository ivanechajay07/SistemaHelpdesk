import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Accesibilidad de diálogos:
 * - bloquea el scroll del documento,
 * - enfoca el primer control al abrir,
 * - atrapa el foco con Tab/Shift+Tab,
 * - cierra con Escape,
 * - devuelve el foco al elemento que abrió el diálogo.
 *
 * Devuelve la ref que debe asignarse al panel del modal.
 */
export function useDialogA11y(isOpen: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () => {
      if (!panel) return [] as HTMLElement[];
      return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
    };

    const timer = window.setTimeout(() => {
      const first = focusables()[0];
      (first ?? panel)?.focus();
    }, 40);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  return panelRef;
}
