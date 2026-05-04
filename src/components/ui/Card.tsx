import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-3xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm p-6 ${className}`}
    >
      {children}
    </div>
  );
}
