"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type FloatingTopNavProps = {
  children: ReactNode;
};

const IDLE_REVEAL_MS = 170;
const TOP_LOCK_OFFSET = 18;
const HIDE_THRESHOLD = 7;
const SHOW_THRESHOLD = 4;

export function FloatingTopNav({ children }: FloatingTopNavProps) {
  const navRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollYRef = useRef(0);
  const latestScrollYRef = useRef(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [navHeight, setNavHeight] = useState(88);

  useEffect(() => {
    if (!navRef.current || typeof window === "undefined") {
      return;
    }

    const element = navRef.current;

    function updateHeight() {
      const nextHeight = Math.ceil(element.getBoundingClientRect().height);

      if (nextHeight > 0) {
        setNavHeight(nextHeight);
      }
    }

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    lastScrollYRef.current = window.scrollY;
    latestScrollYRef.current = window.scrollY;

    function clearStopTimer() {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
    }

    function updateVisibility() {
      frameRef.current = null;

      const currentY = latestScrollYRef.current;
      const previousY = lastScrollYRef.current;
      const delta = currentY - previousY;
      const nextIsAtTop = currentY <= TOP_LOCK_OFFSET;

      setIsAtTop(nextIsAtTop);

      if (nextIsAtTop) {
        setIsVisible(true);
      } else if (delta > HIDE_THRESHOLD) {
        setIsVisible(false);
      } else if (delta < -SHOW_THRESHOLD) {
        setIsVisible(true);
      }

      lastScrollYRef.current = currentY;
    }

    function onScroll() {
      latestScrollYRef.current = window.scrollY;

      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(updateVisibility);
      }

      clearStopTimer();
      stopTimerRef.current = setTimeout(() => {
        if (window.scrollY > TOP_LOCK_OFFSET) {
          setIsVisible(true);
        }
      }, IDLE_REVEAL_MS);
    }

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      clearStopTimer();

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <>
      <div aria-hidden="true" style={{ height: navHeight }} />
      <div
        className={`meta-floating-nav${isVisible ? " is-visible" : " is-hidden"}${isAtTop ? " is-top" : " is-elevated"}`}
        ref={navRef}
      >
        {children}
      </div>
    </>
  );
}
