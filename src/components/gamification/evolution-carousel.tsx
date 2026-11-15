"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Flame, Info, LockKeyhole, Sparkles, Zap } from "lucide-react";
import { evolutionStages as profileHeroLevels } from "@/features/profile/profile-model";
import { MascotStageRenderer } from "./mascot-stage-renderer";

export function EvolutionCarousel({
  currentStage,
  maxUnlocked,
  xp,
  streak,
  onDetails,
}: {
  currentStage: number;
  maxUnlocked: number;
  xp: number;
  streak: number;
  onDetails: (stage: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(
    Math.max(
      0,
      profileHeroLevels.findIndex((entry) => entry.stage === currentStage),
    ),
  );
  const hero = profileHeroLevels[index];
  const activeIndex = useRef(index);
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    let width = element.clientWidth;
    element.scrollLeft = activeIndex.current * width;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      element.scrollLeft = activeIndex.current * width;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  function move(next: number) {
    const target = Math.max(0, Math.min(profileHeroLevels.length - 1, next));
    if (!track.current) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    track.current.scrollTo({
      left: target * track.current.clientWidth,
      behavior: reduced ? "instant" : "smooth",
    });
  }
  return (
    <div
      className="evolution-carousel hero-carousel"
      aria-label="Hero Mochi"
      aria-roledescription="carousel"
      role="region"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        move(index + (event.key === "ArrowRight" ? 1 : -1));
      }}
    >
      <div className="hero-carousel-toolbar">
        <span className="profile-account-kind">
          <Zap size={12} />
          {xp} XP terkumpul
        </span>
        <span className="pill hero-level-badge" aria-live="polite">
          <Sparkles size={12} />
          Level {hero.stage}
        </span>
      </div>
      <div className="hero-carousel-viewport">
        <span className="profile-streak-pill hero-carousel-streak">
          <Flame size={15} />
          {streak} hari streak
        </span>
        <div
          ref={track}
          className="evolution-track"
          onScroll={() => {
            if (!track.current?.clientWidth) return;
            const next = Math.max(
              0,
              Math.min(
                profileHeroLevels.length - 1,
                Math.round(
                  track.current.scrollLeft / track.current.clientWidth,
                ),
              ),
            );
            activeIndex.current = next;
            setIndex(next);
          }}
        >
          {profileHeroLevels.map((stage, i) => {
            const unlocked = stage.stage <= maxUnlocked;
            return (
              <article
                key={stage.stage}
                className={`evolution-stage-card ${unlocked ? "" : "is-locked"} ${stage.stage === currentStage ? "is-current" : ""}`}
                aria-roledescription="slide"
                aria-label={`Mochi level ${stage.stage}, ${unlocked ? "terbuka" : "terkunci"}, ${i + 1} dari ${profileHeroLevels.length}`}
                inert={i !== index}
              >
                <header className="hero-slide-header">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Info hero level ${stage.stage}`}
                    onClick={() => onDetails(stage.stage)}
                    data-modal-focus-key={`evolution-${stage.stage}`}
                  >
                    <Info size={18} />
                  </button>
                </header>
                <div
                  className={`profile-mochi-stage hero-carousel-art ${unlocked ? "" : "is-locked"}`}
                >
                  <div inert={!unlocked} className="hero-carousel-renderer">
                    {stage.stage === 1 ? (
                      <MascotStageRenderer
                        stage={stage.stage}
                        onGreeting={() => {}}
                      />
                    ) : (
                      <Image
                        src={stage.image}
                        alt={`${stage.name}, Mochi level ${stage.stage}`}
                        width={184}
                        height={184}
                        loading="eager"
                        className="hero-stage-image"
                      />
                    )}
                  </div>
                  {!unlocked && (
                    <span className="hero-art-lock" aria-hidden="true">
                      <LockKeyhole size={18} />
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <div className="hero-carousel-navigation">
        <div
          className="evolution-dots"
          aria-label={`Hero ${index + 1} dari ${profileHeroLevels.length}`}
        >
          {profileHeroLevels.map((stage, i) => (
            <button
              type="button"
              key={stage.stage}
              aria-label={`Lihat hero level ${stage.stage}`}
              aria-pressed={i === index}
              onClick={() => move(i)}
            >
              <span />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
