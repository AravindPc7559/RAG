import { useEffect, useRef, useState } from "react";
import { AuthForm } from "@/features/auth/components/AuthForm";

const HEADLINES = [
  "Ask your docs and code with confidence.",
  "Turn repositories into answers you can trust.",
  "Ground every answer in your own sources.",
  "Search docs and GitHub like you mean it.",
  "Build knowledge bases that actually answer.",
] as const;

const TYPE_MS = 42;
const HOLD_TYPED_MS = 3000;
const EXIT_MS = 420;
const ENTER_GAP_MS = 160;

type Phase = "typing" | "holding" | "exiting";

function shuffleMessages(messages: readonly string[]) {
  const next = [...messages];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function splitAccent(text: string, full: string) {
  const lastSpace = full.lastIndexOf(" ");
  if (lastSpace < 0) {
    return { plain: "", accent: text };
  }

  const accentStart = lastSpace + 1;
  return {
    plain: text.slice(0, Math.min(text.length, accentStart)),
    accent: text.length > accentStart ? text.slice(accentStart) : "",
  };
}

export function LoginPage() {
  const queueRef = useRef(shuffleMessages(HEADLINES));
  const indexRef = useRef(0);
  const [headline, setHeadline] = useState(queueRef.current[0] ?? HEADLINES[0]);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");
  const charIndexRef = useRef(0);
  const headlineRef = useRef(headline);
  const phaseRef = useRef<Phase>(phase);

  headlineRef.current = headline;

  useEffect(() => {
    let frame = 0;
    let timeout = 0;
    let lastTick = performance.now();
    let carry = 0;

    const setPhaseNow = (next: Phase) => {
      phaseRef.current = next;
      setPhase(next);
    };

    const advanceHeadline = () => {
      let nextIndex = indexRef.current + 1;
      if (nextIndex >= queueRef.current.length) {
        queueRef.current = shuffleMessages(HEADLINES);
        nextIndex = 0;
      }
      indexRef.current = nextIndex;
      const next = queueRef.current[nextIndex] ?? HEADLINES[0];
      headlineRef.current = next;
      charIndexRef.current = 0;
      setHeadline(next);
      setText("");
      setPhaseNow("typing");
    };

    const tick = (now: number) => {
      const currentPhase = phaseRef.current;
      const currentHeadline = headlineRef.current;

      if (currentPhase !== "typing") {
        lastTick = now;
        frame = requestAnimationFrame(tick);
        return;
      }

      carry += now - lastTick;
      lastTick = now;

      while (carry >= TYPE_MS && charIndexRef.current < currentHeadline.length) {
        carry -= TYPE_MS;
        charIndexRef.current += 1;
      }

      const nextText = currentHeadline.slice(0, charIndexRef.current);
      setText((prev) => (prev === nextText ? prev : nextText));

      if (charIndexRef.current >= currentHeadline.length) {
        setPhaseNow("holding");
        timeout = window.setTimeout(() => {
          setPhaseNow("exiting");
          timeout = window.setTimeout(() => {
            advanceHeadline();
            lastTick = performance.now();
            carry = 0;
          }, EXIT_MS + ENTER_GAP_MS);
        }, HOLD_TYPED_MS);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, []);

  const { plain, accent } = splitAccent(text, headline);
  const isExiting = phase === "exiting";

  return (
    <main className="auth-page">
      <section className="auth-page__intro">
        <span className="brand-mark">S</span>
        <p className="eyebrow">SourceSense</p>
        <h2 className="auth-page__headline" aria-live="polite">
          <span
            className={
              isExiting
                ? "auth-page__headline-stage is-exiting"
                : "auth-page__headline-stage"
            }
          >
            <span className="auth-page__headline-measure" aria-hidden="true">
              {headline}
            </span>
            <span className="auth-page__headline-typed">
              {plain}
              {accent ? (
                <span className="auth-page__headline-accent">{accent}</span>
              ) : null}
              <span
                className={
                  phase === "holding"
                    ? "auth-page__headline-caret is-idle"
                    : "auth-page__headline-caret"
                }
                aria-hidden="true"
              />
            </span>
          </span>
        </h2>
        <p>
          Connect documents and GitHub repositories, build knowledge bases, and
          get answers grounded in your source.
        </p>
      </section>
      <AuthForm mode="login" />
    </main>
  );
}
