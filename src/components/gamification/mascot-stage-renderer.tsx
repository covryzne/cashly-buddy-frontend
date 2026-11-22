"use client";

import Image from "next/image";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import SplineMascot from "./spline-mascot";
import { AppLoader } from "@/components/shared/app-loader";
import { useOnline } from "@/lib/pwa/connectivity";
import { evolutionStages } from "@/features/profile/profile-model";
class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function MascotStageRenderer({
  stage,
  onGreeting,
}: {
  stage: number;
  onGreeting: () => void;
}) {
  const online = useOnline();
  const hero = evolutionStages.find((entry) => entry.stage === stage) ?? evolutionStages[0];
  const poster = hero.stage === 1 ? "/mascot/mochi-level-1-transparent.png" : hero.image;
  const ref = useRef<HTMLButtonElement>(null);
  const greetingRef = useRef<(() => void) | null>(null);
  const [eligible, setEligible] = useState(false);
  const [phase, setPhase] = useState<"poster" | "loading" | "ready" | "failed">(
    "loading",
  );
  const [failedPoster, setFailedPoster] = useState<string | null>(null);
  const onReady = useCallback((greet: () => void) => {
    greetingRef.current = greet;
    setPhase("ready");
  }, []);
  const onFailure = useCallback(() => setPhase("failed"), []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    function update() {
      greetingRef.current = null;
      const shouldLoad = !motion.matches && online;
      setEligible(shouldLoad);
      setPhase(shouldLoad ? "loading" : "poster");
    }
    function retry() {
      if (!motion.matches && online)
        setPhase((current) => (current === "failed" ? "loading" : current));
    }
    update();
    motion.addEventListener("change", update);
    window.addEventListener("online", retry);
    return () => {
      motion.removeEventListener("change", update);
      window.removeEventListener("online", retry);
    };
  }, [online]);

  useEffect(() => {
    if (phase !== "loading") return;
    const timeout = window.setTimeout(() => setPhase("failed"), 20000);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  return (
    <button
      ref={ref}
      className="mascot-button"
      onClick={() => {
        if (phase === "ready") greetingRef.current?.();
        onGreeting();
      }}
      aria-label="Sapa Mochi"
      data-unlocked-stage={stage}
      data-scene-state={phase}
    >
      {(phase === "poster" || phase === "failed") &&
        (failedPoster === poster ? (
          <span className="mascot-fallback" aria-hidden="true">
            ☺
          </span>
        ) : (
          <Image
            src={poster}
            alt={`${hero.name}, Mochi level ${hero.stage}`}
            width={160}
            height={160}
            loading="eager"
            unoptimized
            onError={() => setFailedPoster(poster)}
          />
        ))}
      {phase === "loading" && (
        <div
          className="mascot-loading"
        >
          <AppLoader />
        </div>
      )}
      {eligible && phase !== "failed" && (
        <span
          className={`spline-mascot ${phase === "ready" ? "is-ready" : ""}`}
          aria-hidden="true"
        >
          <SceneBoundary onFailure={onFailure}>
            <SplineMascot onReady={onReady} onFailure={onFailure} />
          </SceneBoundary>
        </span>
      )}
    </button>
  );
}
