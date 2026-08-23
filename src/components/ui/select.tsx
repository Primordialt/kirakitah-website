import { cn } from "@/lib/cn";
import {
  FieldDescription,
  FieldError,
  Label,
  useFieldIds,
} from "@/components/ui/label";
import { ChevronDown } from "lucide-react";
import { type SelectHTMLAttributes, forwardRef, useId } from "react";

const selectWrapperStyles = "relative w-full";

const selectStyles = cn(
  "flex h-10 w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 pr-10",
  "text-body text-text-primary",
  "transition-standard transition-colors",
  "hover:border-border-strong",
  "focus-visible:border-border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/30",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border",
  "aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:ring-error/30",
);

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  label?: string;
  description?: string;
  error?: string;
  id?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      description,
      error,
      required,
      disabled,
      id: idProp,
      options,
      placeholder,
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

    const select = (
      <div className={selectWrapperStyles}>
        <select
          ref={ref}
          id={id}
          className={cn(selectStyles, className)}
          disabled={disabled}
          required={required}
          {...props}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
      </div>
    );

    if (!label && !description && !error) {
      return select;
    }

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <Label htmlFor={id} required={required}>
            {label}
          </Label>
        )}
        {select}
        {description && !error && (
          <FieldDescription id={descriptionId}>{description}</FieldDescription>
        )}
        {error && <FieldError id={errorId}>{error}</FieldError>}
      </div>
    );
  },
);

Select.displayName = "Select";
