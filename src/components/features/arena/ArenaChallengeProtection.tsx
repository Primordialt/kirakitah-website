"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type ArenaChallengeShellProps = {
  children: ReactNode;
  className?: string;
};

export function blockArenaClipboardEvent(event: { preventDefault: () => void }) {
  event.preventDefault();
}

export function isArenaCopyShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  if (key !== "c" && key !== "x") return false;
  return event.ctrlKey || event.metaKey;
}

export function isArenaPasteShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v";
}

export function ArenaChallengeShell({ children, className = "" }: ArenaChallengeShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [obscured, setObscured] = useState(false);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setObscured(true);
      else setObscured(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (isArenaCopyShortcut(event.nativeEvent)) {
      event.preventDefault();
    }
  }, []);

  return (
    <div
      ref={shellRef}
      className={`arena-challenge-protected select-none ${className}`.trim()}
      onCopy={blockArenaClipboardEvent}
      onCut={blockArenaClipboardEvent}
      onContextMenu={blockArenaClipboardEvent}
      onKeyDown={onKeyDown}
      draggable={false}
      data-arena-challenge=""
    >
      <div className={obscured ? "blur-md opacity-40 transition" : "transition"}>
        {children}
      </div>
      {obscured ? (
        <p
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-body-sm text-text-muted"
          role="status"
        >
          Challenge hidden while tab is inactive
        </p>
      ) : null}
    </div>
  );
}

type TypeRushInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  onPasteRejected?: () => void;
  disabled?: boolean;
};

export function TypeRushProtectedInput({
  value,
  onValueChange,
  onPasteRejected,
  disabled,
}: TypeRushInputProps) {
  return (
    <textarea
      value={value}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      disabled={disabled}
      rows={3}
      className="mt-1 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2"
      onChange={(event) => onValueChange(event.target.value)}
      onPaste={(event) => {
        event.preventDefault();
        onPasteRejected?.();
      }}
      onKeyDown={(event) => {
        if (isArenaPasteShortcut(event.nativeEvent)) {
          event.preventDefault();
          onPasteRejected?.();
        }
      }}
    />
  );
}
