"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import { ReactNode } from "react";

// LazyMotion con domAnimation reduce el bundle en ~20KB
// Solo carga las features necesarias para animaciones DOM
export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}

