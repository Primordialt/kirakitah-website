import { cn } from "@/lib/cn";
import {
  FieldDescription,
  FieldError,
  Label,
  useFieldIds,
} from "@/components/ui/label";
import { type InputHTMLAttributes, forwardRef, useId } from "react";

const inputStyles = cn(
  "flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2",
  "text-body text-text-primary placeholder:text-text-muted",
  "transition-standard transition-colors",
  "hover:border-border-strong",
  "focus-visible:border-border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/30",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border",
  "aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:ring-error/30",
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label?: string;
  description?: string;
  error?: string;
  id?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      description,
      error,
      required,
      disabled,
      id: idProp,
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

    const input = (
      <input
        ref={ref}
        id={id}
        className={cn(inputStyles, className)}
        disabled={disabled}
        required={required}
        {...props}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
      />
    );

    if (!label && !description && !error) {
      return input;
    }

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <Label htmlFor={id} required={required}>
            {label}
          </Label>
        )}
        {input}
        {description && !error && (
          <FieldDescription id={descriptionId}>{description}</FieldDescription>
        )}
        {error && <FieldError id={errorId}>{error}</FieldError>}
      </div>
    );
  },
);

Input.displayName = "Input";
