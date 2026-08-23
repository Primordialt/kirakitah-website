import { cn } from "@/lib/cn";
import { type LabelHTMLAttributes, forwardRef } from "react";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-label text-text-primary", className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-error" aria-hidden="true">
          *
        </span>
      )}
    </label>
  ),
);

Label.displayName = "Label";

export interface FieldDescriptionProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export function FieldDescription({
  id,
  className,
  children,
}: FieldDescriptionProps) {
  return (
    <p id={id} className={cn("text-body-sm text-text-muted", className)}>
      {children}
    </p>
  );
}

export interface FieldErrorProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export function FieldError({ id, className, children }: FieldErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      className={cn("text-body-sm text-error", className)}
    >
      {children}
    </p>
  );
}

export function useFieldIds(id: string) {
  return {
    descriptionId: `${id}-description`,
    errorId: `${id}-error`,
  };
}
