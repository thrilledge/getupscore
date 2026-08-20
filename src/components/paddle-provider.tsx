"use client";

import {
  initializePaddle,
  type Paddle,
  type PaddleEventData,
} from "@paddle/paddle-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

const PaddleContext = createContext<Paddle | undefined>(
  undefined
);

type CheckoutHandler = (data: any) => void;

let _checkoutHandlerRef: CheckoutHandler | null = null;

export function setCheckoutCompletedHandler(handler: CheckoutHandler) {
  _checkoutHandlerRef = handler;
}

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
    const seller = Number(process.env.NEXT_PUBLIC_PADDLE_SELLER_ID);
    const env =
      process.env.NEXT_PUBLIC_PADDLE_ENV as
        | "sandbox"
        | "production";

    if (!seller) {
      console.warn("[Paddle] NEXT_PUBLIC_PADDLE_SELLER_ID is missing");
      return;
    }

    initializePaddle({
      environment: env ?? "sandbox",
      seller,
      eventCallback: (event: PaddleEventData) => {
        if (event.name === "checkout.completed" && _checkoutHandlerRef) {
          _checkoutHandlerRef(event.data);
        }
      },
    }).then((p) => {
      console.log("[Paddle] Initialized successfully");
      setPaddle(p);
    }).catch((err) => {
      console.error("[Paddle] Init failed:", err);
    });
  }, []);

  return (
    <PaddleContext.Provider value={paddle}>
      {children}
    </PaddleContext.Provider>
  );
}
