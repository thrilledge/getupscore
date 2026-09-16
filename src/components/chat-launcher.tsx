"use client";

import {
  cloneElement,
  useEffect,
  useSyncExternalStore,
  useState,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import { MessageSquare } from "lucide-react";

const clientStore = {
  subscribe: () => () => {},
  getSnapshot: () => true,
  getServerSnapshot: () => false,
};

function useIsClient() {
  return useSyncExternalStore(
    clientStore.subscribe,
    clientStore.getSnapshot,
    clientStore.getServerSnapshot
  );
}

type ChatChild = ReactElement<{
  onClose?: () => void;
}>;

interface ChatLauncherProps {
  label: string;
  children: ChatChild;
}

export function ChatLauncher({
  label,
  children,
}: ChatLauncherProps) {
  const isClient = useIsClient();
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!isClient) return null;

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => {
          setHasOpened(true);
          setOpen(true);
        }}
        aria-label={`Open ${label}`}
        className="group fixed bottom-5 right-5 z-[999] inline-flex h-13 items-center gap-2.5 rounded-full bg-[#0A0A0A] py-3.5 pr-5 pl-3.5 text-white shadow-[0_12px_38px_rgba(0,0,0,0.4)] ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:ring-[#00C98B]/60 hover:shadow-[0_16px_44px_rgba(0,0,0,0.45)]"
      >
        <span className="relative grid size-7 place-items-center rounded-full bg-[#00C98B] text-[#0A0A0A] transition-transform duration-300 group-hover:scale-105">
          <MessageSquare className="size-3.5" />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full border-2 border-[#0A0A0A] bg-[#00C98B] animate-pulse" />
        </span>
        <span className="text-sm leading-none font-semibold">{label}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1000]"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
          />

          <div className="absolute inset-0 flex flex-col overflow-hidden rounded-none bg-[#0A0A0A] shadow-2xl ring-1 ring-white/10 sm:inset-x-5 sm:inset-y-[5vh] sm:rounded-[28px] animate-in fade-in-0 slide-in-from-bottom-3 duration-200">
            <div className="min-h-0 flex-1">
              {hasOpened &&
                cloneElement(children, {
                  onClose: () => setOpen(false),
                })}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}