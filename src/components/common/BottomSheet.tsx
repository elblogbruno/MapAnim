import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { haptics } from '../../utils/haptics';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxHeight?: string; // default: 'max-h-[85dvh]'
  defaultExpanded?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = 'max-h-[85dvh]',
  defaultExpanded = false,
}) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsDragging(false);
      setIsExpanded(defaultExpanded);
    }
  }, [isOpen, defaultExpanded]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    currentYRef.current = touch.clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    currentYRef.current = touch.clientY;
    const deltaY = currentYRef.current - startYRef.current;

    // Check if inner content is scrolled
    const isScrolledToTop = contentRef.current ? contentRef.current.scrollTop <= 2 : true;

    if (deltaY > 0) {
      // Dragging downward (pull to dismiss)
      if (isScrolledToTop) {
        setDragY(deltaY);
      }
    } else if (deltaY < 0 && !isExpanded) {
      // Dragging upward (pull to expand)
      setDragY(deltaY * 0.35); // Slight rubber band resistance
    }
  }, [isDragging, isExpanded]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const deltaY = currentYRef.current - startYRef.current;

    if (deltaY > 150) {
      // Direct dismiss on large pull
      haptics.light();
      onClose();
    } else if (deltaY > 70) {
      if (isExpanded) {
        // Collapse from expanded to compact
        haptics.light();
        setIsExpanded(false);
        setDragY(0);
      } else {
        // Dismiss from compact
        haptics.light();
        onClose();
      }
    } else if (deltaY < -55 && !isExpanded) {
      // User pulled up past threshold -> expand!
      haptics.light();
      setIsExpanded(true);
      setDragY(0);
    } else {
      // Snap back to resting position
      setDragY(0);
    }
  }, [isDragging, isExpanded, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-fade-in pointer-events-auto"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        style={{
          transform: `translateY(${Math.max(0, dragY)}px)`,
          transition: isDragging ? 'none' : 'transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.3s ease',
        }}
        className={`w-full sm:max-w-md bg-studio-900 border border-studio-750 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-black/80 flex flex-col ${
          isExpanded ? 'h-[92dvh] max-h-[92dvh]' : `${maxHeight} min-h-[40dvh]`
        } overflow-hidden pb-safe mb-0 select-none`}
      >
        {/* Touch Drag Zone (Handle + Header) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none bg-studio-900"
        >
          {/* Visual Grab Handle Pill */}
          <div className="py-2.5 flex items-center justify-center">
            <div className="w-12 h-1.5 bg-studio-600/80 hover:bg-studio-500 rounded-full transition-colors" />
          </div>

          {/* Header */}
          {title && (
            <div className="px-4 pb-3 flex items-center justify-between border-b border-studio-800">
              <div className="font-extrabold text-xs uppercase tracking-wider text-studio-100 flex items-center gap-2">
                {title}
              </div>
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  onClose();
                }}
                className="p-1.5 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800 transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content Container */}
        <div
          ref={contentRef}
          data-scrollable="true"
          className="flex-1 overflow-y-auto overscroll-contain p-4 text-xs select-text touch-pan-y"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
