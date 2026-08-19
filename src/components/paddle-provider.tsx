"use client";

import {
  initializePaddle,
  type Paddle,
} from "@paddle/paddle-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const PaddleContext = createContext<Paddle | undefined>(
  undefined
);

export function usePaddle() {
  return useContext(PaddleContext);
}

export function PaddleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [paddle, setPaddle] = useState<Paddle>();

  useEffect(() => {
    const token =
      process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const env =
      process.env.NEXT_PUBLIC_PADDLE_ENV as
        | "sandbox"
        | "production";

    if (!token) return;

    initializePaddle({
      environment: env ?? "sandbox",
      token,
    }).then((p) => setPaddle(p));
  }, []);

  return (
    <PaddleContext.Provider value={paddle}>
      {children}
    </PaddleContext.Provider>
  );
}
