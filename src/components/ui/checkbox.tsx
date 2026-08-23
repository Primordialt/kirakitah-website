"use client";

import { cn } from "@/lib/cn";
import {
  FieldDescription,
  FieldError,
  useFieldIds,
} from "@/components/ui/label";
import { Check } from "lucide-react";
import {
  type InputHTMLAttributes,
  forwardRef,
  useId,
} from "react";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  id?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      error,
      required,
      disabled,
      id: idProp,
      checked,
      defaultChecked,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const { descriptionId, errorId } = useFieldIds(id);

    const describedBy =
      [description ? descriptionId : null, error ? errorId : null]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={id}
          className={cn(
            "flex cursor-pointer items-start gap-3",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <span className="relative flex shrink-0 items-center">
            <input
              ref={ref}
              type="checkbox"
              id={id}
              className="peer sr-only"
              disabled={disabled}
              required={required}
              checked={checked}
              defaultChecked={defaultChecked}
              aria-invalid={error ? "true" : undefined}
              aria-describedby={describedBy}
              {...props}
            />
            <span
              className={cn(
                "pointer-events-none flex size-5 items-center justify-center rounded-md border border-border bg-surface",
                "transition-standard transition-colors",
                "peer-hover:border-border-strong",
                "peer-focus-visible:border-border-focus peer-focus-visible:ring-2 peer-focus-visible:ring-border-focus/30",
                "peer-checked:border-brand-primary peer-checked:bg-brand-primary",
                "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                "peer-aria-[invalid=true]:border-error",
                "[&_svg]:opacity-0 peer-checked:[&_svg]:opacity-100",
                className,
              )}
              aria-hidden="true"
            >
              <Check className="size-3 text-white" />
            </span>
          </span>
          {(label || description) && (
            <span className="flex flex-col gap-0.5 pt-0.5">
              {label && (
                <span className="text-label text-text-primary">
                  {label}
                  {required && (
                    <span className="ml-0.5 text-error" aria-hidden="true">
                      *
                    </span>
                  )}
                </span>
              )}
              {description && !error && (
                <FieldDescription id={descriptionId}>
                  {description}
                </FieldDescription>
              )}
            </span>
          )}
        </label>
        {error && <FieldError id={errorId}>{error}</FieldError>}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
