"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type AnimatedNavLinkProps = {
  href: string;
  label: string;
  className?: string;
};

const LEAVE_ANIMATION_MS = 520;

export function AnimatedNavLink({
  href,
  label,
  className,
}: AnimatedNavLinkProps) {
  const [animationState, setAnimationState] = useState<
    "hovered" | "idle" | "leaving"
  >("idle");
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  function clearLeaveTimer() {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }

  function handleEnter() {
    clearLeaveTimer();
    setAnimationState("hovered");
  }

  function handleLeave() {
    clearLeaveTimer();
    setAnimationState("leaving");

    leaveTimerRef.current = setTimeout(() => {
      setAnimationState("idle");
      leaveTimerRef.current = null;
    }, LEAVE_ANIMATION_MS);
  }

  function renderCharacter(char: string, index: number): ReactNode {
    const isSpace = char === " ";
    const content = isSpace ? "\u00A0" : char;

    return (
      <span
        aria-hidden="true"
        className={`meta-nav-char${isSpace ? " meta-nav-char--space" : ""}`}
        key={`${char}-${index}`}
        style={{ "--letter-index": index } as CSSProperties}
      >
        <span className="meta-nav-char-base">{content}</span>
        <span className="meta-nav-char-hover">{content}</span>
      </span>
    );
  }

  return (
    <Link
      className={`meta-nav-link${className ? ` ${className}` : ""}`}
      data-state={animationState}
      href={href}
      onBlur={handleLeave}
      onFocus={handleEnter}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="meta-nav-text">
        {Array.from(label).map(renderCharacter)}
      </span>
    </Link>
  );
}
