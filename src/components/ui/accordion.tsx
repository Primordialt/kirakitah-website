"use client";

import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type AccordionType = "single" | "multiple";

interface AccordionContextValue {
  type: AccordionType;
  openItems: Set<string>;
  toggle: (value: string) => void;
  collapsible: boolean;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within Accordion");
  }
  return context;
}

interface AccordionItemContextValue {
  value: string;
  triggerId: string;
  contentId: string;
  isOpen: boolean;
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(
  null,
);

function useAccordionItemContext() {
  const context = useContext(AccordionItemContext);
  if (!context) {
    throw new Error(
      "AccordionTrigger and AccordionContent must be used within AccordionItem",
    );
  }
  return context;
}

export interface AccordionProps {
  type?: AccordionType;
  collapsible?: boolean;
  defaultValue?: string | string[];
  children: ReactNode;
  className?: string;
}

export function Accordion({
  type = "single",
  collapsible = true,
  defaultValue,
  children,
  className,
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(() => {
    if (!defaultValue) return new Set();
    if (Array.isArray(defaultValue)) return new Set(defaultValue);
    return new Set([defaultValue]);
  });

  const toggle = useCallback(
    (value: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev);
        if (type === "single") {
          if (next.has(value)) {
            if (collapsible) next.delete(value);
          } else {
            next.clear();
            next.add(value);
          }
        } else {
          if (next.has(value)) {
            next.delete(value);
          } else {
            next.add(value);
          }
        }
        return next;
      });
    },
    [type, collapsible],
  );

  const value = useMemo(
    () => ({ type, openItems, toggle, collapsible }),
    [type, openItems, toggle, collapsible],
  );

  return (
    <AccordionContext.Provider value={value}>
      <div className={cn("flex flex-col gap-2", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export interface AccordionItemProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function AccordionItem({
  value,
  children,
  className,
}: AccordionItemProps) {
  const { openItems } = useAccordionContext();
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const contentId = `${baseId}-content`;
  const isOpen = openItems.has(value);

  return (
    <AccordionItemContext.Provider
      value={{ value, triggerId, contentId, isOpen }}
    >
      <div
        className={cn(
          "rounded-xl border border-border bg-surface overflow-hidden",
          className,
        )}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

export interface AccordionTriggerProps {
  children: ReactNode;
  className?: string;
}

export function AccordionTrigger({
  children,
  className,
}: AccordionTriggerProps) {
  const { toggle } = useAccordionContext();
  const { value, triggerId, contentId, isOpen } = useAccordionItemContext();

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle(value);
    }
  };

  return (
    <h3 className="m-0">
      <button
        type="button"
        id={triggerId}
        className={cn(
          "flex w-full items-center justify-between gap-4 px-5 py-4 text-left",
          "text-body font-medium text-text-primary",
          "transition-standard transition-colors",
          "hover:bg-surface-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus/50",
          className,
        )}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => toggle(value)}
        onKeyDown={handleKeyDown}
      >
        {children}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-text-muted transition-standard transition-transform",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
    </h3>
  );
}

export interface AccordionContentProps {
  children: ReactNode;
  className?: string;
}

export function AccordionContent({
  children,
  className,
}: AccordionContentProps) {
  const { triggerId, contentId, isOpen } = useAccordionItemContext();

  return (
    <div
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      hidden={!isOpen}
      className={cn(
        "border-t border-border px-5 py-4 text-body-sm text-text-secondary",
        className,
      )}
    >
      {children}
    </div>
  );
}
