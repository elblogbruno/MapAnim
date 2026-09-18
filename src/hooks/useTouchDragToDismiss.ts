import { useState, useRef, useCallback } from 'react';
import { haptics } from '../utils/haptics';

interface TouchDragOptions {
  onDismiss: () => void;
  threshold?: number;
  onExpand?: () => void;
}

export const useTouchDragToDismiss = ({
  onDismiss,
  threshold = 75,
  onExpand,
}: TouchDragOptions) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    currentYRef.current = touch.clientY;
    setIsDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    currentYRef.current = touch.clientY;
    const deltaY = currentYRef.current - startYRef.current;

    if (deltaY > 0) {
      // Dragging down -> pull to dismiss
      setDragY(deltaY);
    } else if (deltaY < 0 && onExpand) {
      // Dragging up -> pull to expand
      setDragY(deltaY * 0.35);
    }
  }, [onExpand]);

  const onTouchEnd = useCallback(() => {
    setIsDragging(false);
    const deltaY = currentYRef.current - startYRef.current;

    if (deltaY > threshold) {
      haptics.light();
      onDismiss();
    } else if (deltaY < -60 && onExpand) {
      haptics.light();
      onExpand();
    }
    setDragY(0);
  }, [threshold, onDismiss, onExpand]);

  const sheetStyle: React.CSSProperties = {
    transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  return {
    dragY,
    isDragging,
    dragProps: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    sheetStyle,
  };
};
