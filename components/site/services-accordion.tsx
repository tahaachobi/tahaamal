"use client";

import { useState } from "react";

type ServicePanel = {
  description: string;
  id: string;
  title: string;
};

type ServicesAccordionProps = {
  services: ServicePanel[];
};

const serviceHighlights: Record<string, string[]> = {
  "01": [
    "turns heads",
    "expert hands",
    "shine, volume, and elegance",
    "feminine, lifted, and beautifully complete",
  ],
  "02": [
    "hands speak",
    "elegance",
    "refined nail shaping",
    "quiet luxury",
  ],
  "03": [
    "most beautiful accessory",
    "love and expertise",
    "restore clarity, comfort, and glow",
    "healthy radiance",
  ],
  "04": [
    "unveils it",
    "soft glam",
    "flawless evening presence",
    "more striking",
  ],
  "05": [
    "radiant skin",
    "self-love",
    "cleanliness, comfort, and technique",
    "softer, lighter",
  ],
  "06": [
    "moment, your peace, your escape",
    "release, quiet, and reset",
    "deeply calming atmosphere",
    "back to balance",
  ],
};

const serviceNarratives: Record<string, string> = {
  "01":
    "From polished brushing to soft movement and camera-ready finish, this service is designed to shape shine, volume, and elegance around your face with precision. The result feels feminine, lifted, and beautifully complete from the first mirror glance to the last detail.",
  "02":
    "We focus on refined nail shaping, clean cuticle work, balanced color placement, and modern art details that feel graceful instead of excessive. Every set is approached like a finishing accessory that brings softness, confidence, and quiet luxury to your overall look.",
  "03":
    "This ritual is created to restore clarity, comfort, and glow through thoughtful cleansing, treatment layering, and skin-respecting techniques that leave the face fresh and visibly refined. It is less about a quick treatment and more about giving your complexion the calm, healthy radiance it should always carry.",
  "04":
    "Whether the intention is soft glam, elevated bridal polish, or a flawless evening presence, every tone, texture, and contour is built to enhance your features instead of masking them. The finish is luminous, balanced, and expressive, so your face still feels like you - only more striking.",
  "05":
    "This service combines cleanliness, comfort, and technique to make body care feel professional, discreet, and genuinely soothing rather than rushed. Beyond the immediate result, the goal is to leave your skin feeling softer, lighter, and more confidently cared for.",
  "06":
    "The experience is built around release, quiet, and reset, helping tension leave the shoulders, the back, and the mind through slow, intentional pressure and a deeply calming atmosphere. It is the kind of pause that restores energy gently and lets your entire body come back to balance.",
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(text: string, phrases: string[]) {
  if (!phrases.length) {
    return text;
  }

  const pattern = new RegExp(`(${phrases.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const isMatch = phrases.some(
      (phrase) => phrase.toLowerCase() === part.toLowerCase(),
    );

    if (!isMatch) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <mark
        className="mx-[0.04em] inline rounded-[0.3rem] bg-[linear-gradient(180deg,transparent_18%,rgba(214,172,93,0.18)_18%,rgba(214,172,93,0.42)_84%,transparent_84%)] px-[0.16em] py-[0.04em] font-medium text-white"
        key={`${part}-${index}`}
      >
        {part}
      </mark>
    );
  });
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isOpen
          ? "border-white/24 bg-white/[0.08] text-white"
          : "text-white/54 hover:border-white/16 hover:text-white/78"
      }`}
    >
      <svg
        aria-hidden="true"
        className={`h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "rotate-180" : "rotate-0"
        }`}
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          d="M5 7.5L10 12.5L15 7.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    </span>
  );
}

export function ServicesAccordion({ services }: ServicesAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mt-8 border-t border-white/20">
      {services.map((service) => {
        const isOpen = openId === service.id;
        const cleanDescription = service.description
          .replaceAll("â€”", "-")
          .replaceAll("Ã¢â‚¬â€", "-");
        const extendedDescription = serviceNarratives[service.id];
        const highlights = serviceHighlights[service.id] ?? [];

        return (
          <article
            className="border-b border-white/10 py-4 sm:py-5"
            key={service.id}
          >
            <button
              aria-expanded={isOpen}
              className="group flex w-full items-center gap-4 text-left"
              onClick={() => setOpenId(isOpen ? null : service.id)}
              type="button"
            >
              <span className="w-12 shrink-0 text-xs uppercase tracking-[0.28em] text-white/36 sm:w-16">
                {service.id}
              </span>
              <span className="min-w-0 flex-1 pr-3 text-[1.2rem] font-medium tracking-[-0.035em] text-white transition-colors duration-300 group-hover:text-white/88 sm:text-[1.55rem]">
                {service.title}
              </span>
              <ChevronIcon isOpen={isOpen} />
            </button>

            <div
              className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin-top] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isOpen
                  ? "mt-5 grid-rows-[1fr] opacity-100"
                  : "mt-0 grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="space-y-4 pl-0 pr-14 pt-1 sm:pr-16 md:pl-16">
                  <p className="max-w-[72ch] text-sm leading-8 text-white/78 sm:text-[1rem]">
                    {renderHighlightedText(cleanDescription, highlights)}
                  </p>
                  <p className="max-w-[72ch] text-sm leading-8 text-white/56 sm:text-[0.96rem]">
                    {renderHighlightedText(extendedDescription, highlights)}
                  </p>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
