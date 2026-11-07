"use client";
import { useState } from "react";
import OpeningAnimation from "./opening-animation";

function DevelopmentIntro() {
  const [replay, setReplay] = useState(0);
  return (
    <>
      <OpeningAnimation key={replay} />
      <button
        className="intro-replay"
        type="button"
        onClick={() => setReplay((n) => n + 1)}
      >
        Replay Intro
      </button>
    </>
  );
}
export default function IntroController() {
  return process.env.NODE_ENV === "development" ? (
    <DevelopmentIntro />
  ) : (
    <OpeningAnimation />
  );
}
