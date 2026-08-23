import { cn } from "@/lib/cn";
import { formatFileSize } from "@/lib/identity-upload";
import {
  FieldDescription,
  FieldError,
  Label,
  useFieldIds,
} from "@/components/ui/label";
import { type InputHTMLAttributes, forwardRef, useId } from "react";

const fileInputStyles = cn(
  "flex w-full cursor-pointer rounded-lg border border-border bg-surface px-3 py-2",
  "text-body text-text-primary file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand-primary/15 file:px-3 file:py-1.5 file:text-label file:font-medium file:text-text-primary",
  "transition-standard transition-colors",
  "hover:border-border-strong",
  "focus-visible:border-border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/30",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border",
  "aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:ring-error/30",
);

export interface FileInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  label?: string;
  description?: string;
  error?: string;
  id?: string;
  selectedFile?: File | null;
}

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      className,
      label,
      description,
      error,
      required,
      disabled,
      id: idProp,
      selectedFile,
      accept,
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
      <>
        <input
          ref={ref}
          id={id}
          type="file"
          className={cn(fileInputStyles, className)}
          disabled={disabled}
          required={required}
          accept={accept}
          {...props}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
        />
        {selectedFile ? (
          <p className="text-body-sm text-text-secondary" aria-live="polite">
            Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </p>
        ) : null}
      </>
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

FileInput.displayName = "FileInput";
