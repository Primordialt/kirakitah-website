"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactFormValues } from "@/domain/contact";
import { contactPageContent } from "@/config/pages";
import { services } from "@/services";
import { Button, Input, Select, Textarea } from "@/components/ui";

type FormStatus = "idle" | "submitting" | "success" | "failure";

export function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: undefined,
      message: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (status === "success") {
      successRef.current?.focus();
    }
  }, [status]);

  const onSubmit = async (data: ContactFormValues) => {
    setStatus("submitting");
    setErrorMessage(null);

    const result = await services.contact.submit(data);

    if (result.success) {
      setStatus("success");
      reset();
      return;
    }

    setStatus("failure");
    setErrorMessage(result.message ?? "Unable to send your message. Please try again.");
  };

  if (status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        className="rounded-2xl border border-border-interactive bg-surface-elevated p-8 text-center outline-none md:p-12"
        role="status"
        aria-live="polite"
      >
        <h2 className="text-h2 text-text-primary">MESSAGE RECEIVED</h2>
        <p className="mt-4 text-body-lg text-text-secondary">
          Thank you for contacting KIRAKITAH. We will review your message and
          respond through the contact details you provided.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-8"
          onClick={() => setStatus("idle")}
        >
          SEND ANOTHER MESSAGE
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 md:p-8"
      noValidate
    >
      <Input
        label="Name"
        required
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />
      <Input
        label="Email"
        type="email"
        required
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Select
        label="Subject"
        required
        placeholder="Select a subject"
        options={contactPageContent.subjects.map((subject) => ({
          value: subject.value,
          label: subject.label,
        }))}
        error={errors.subject?.message}
        {...register("subject")}
      />
      <Textarea
        label="Message"
        required
        rows={6}
        error={errors.message?.message}
        {...register("message")}
      />

      {status === "failure" && errorMessage ? (
        <p className="text-body-sm text-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "SENDING..." : "SEND MESSAGE"}
      </Button>
    </form>
  );
}
