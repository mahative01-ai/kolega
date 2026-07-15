"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

type ConfettiPreset = "school-pride" | "snow" | "fireworks" | "all";

interface ConfettiTriggerProps {
  preset?: ConfettiPreset;
}

export function ConfettiTrigger({ preset = "all" }: ConfettiTriggerProps) {
  useEffect(() => {
    const selectedPreset = preset === "all"
      ? (["school-pride", "snow", "fireworks"][Math.floor(Math.random() * 3)] as ConfettiPreset)
      : preset;

    if (selectedPreset === "school-pride") {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const colors = ["#1d4ed8", "#3b82f6", "#ffffff", "#f59e0b"]; // Mahative/Kipa colors

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: colors,
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } else if (selectedPreset === "snow") {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      let skew = 1;

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const frame = () => {
        const timeLeft = animationEnd - Date.now();
        const ticks = Math.max(200, 500 * (timeLeft / duration));
        skew = Math.max(0.8, skew - 0.001);

        confetti({
          particleCount: 2,
          startVelocity: 0,
          ticks: ticks,
          origin: {
            x: Math.random(),
            y: Math.random() * skew - 0.2,
          },
          colors: ["#3b82f6", "#60a5fa", "#ffffff", "#93c5fd"],
          shapes: ["circle"],
          gravity: randomInRange(0.4, 0.6),
          scalar: randomInRange(0.5, 1),
          drift: randomInRange(-0.5, 0.5),
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } else if (selectedPreset === "fireworks") {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);
    }
  }, [preset]);

  return null;
}

export function triggerInstantConfetti(preset: ConfettiPreset = "all") {
  const selectedPreset = preset === "all"
    ? (["school-pride", "snow", "fireworks"][Math.floor(Math.random() * 3)] as ConfettiPreset)
    : preset;

  if (selectedPreset === "school-pride") {
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const colors = ["#1d4ed8", "#3b82f6", "#ffffff", "#f59e0b"];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: colors,
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  } else if (selectedPreset === "snow") {
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    let skew = 1;

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const frame = () => {
      const timeLeft = animationEnd - Date.now();
      const ticks = Math.max(200, 500 * (timeLeft / duration));
      skew = Math.max(0.8, skew - 0.001);

      confetti({
        particleCount: 2,
        startVelocity: 0,
        ticks: ticks,
        origin: {
          x: Math.random(),
          y: Math.random() * skew - 0.2,
        },
        colors: ["#3b82f6", "#60a5fa", "#ffffff", "#93c5fd"],
        shapes: ["circle"],
        gravity: randomInRange(0.4, 0.6),
        scalar: randomInRange(0.5, 1),
        drift: randomInRange(-0.5, 0.5),
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  } else if (selectedPreset === "fireworks") {
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  }
}
