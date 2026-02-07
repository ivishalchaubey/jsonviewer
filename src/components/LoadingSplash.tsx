"use client";

import { useEffect, useState } from "react";

interface LoadingSplashProps {
  progress?: number;
  message?: string;
}

export function LoadingSplash({
  progress = 0,
  message = "Loading JSON data...",
}: LoadingSplashProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center animate-gradient"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="text-center space-y-8">
        {/* Animated JSON Icon */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full blur-xl opacity-40 animate-pulse"
            style={{ background: "linear-gradient(to right, var(--accent), #a855f7)" }}
          />
          <div className="relative rounded-2xl p-8 shadow-2xl animate-float"
            style={{ background: "linear-gradient(to bottom right, var(--accent), #7c3aed)" }}
          >
            <div className="text-6xl font-bold text-white font-mono">
              {"{ }"}
            </div>
          </div>
        </div>

        {/* Loading Message */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {message}
            <span className="inline-block w-8 text-left">{dots}</span>
          </h2>

          {/* Progress Bar */}
          <div
            className="w-80 h-3 rounded-full overflow-hidden shadow-inner mx-auto"
            style={{ backgroundColor: "var(--border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300 ease-out animate-shimmer"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: "linear-gradient(to right, var(--accent), #7c3aed, #ec4899)",
              }}
            />
          </div>

          {/* Progress Percentage */}
          {progress > 0 && (
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {Math.round(progress)}%
            </p>
          )}
        </div>

        {/* Spinning loader */}
        <div className="flex justify-center">
          <div
            className="w-12 h-12 border-4 rounded-full animate-spin"
            style={{
              borderColor: "var(--border)",
              borderTopColor: "var(--accent)",
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 6s ease infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
