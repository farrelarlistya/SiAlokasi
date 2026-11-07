import { useEffect, useId, useState } from "react";
import { Button } from "./Button";
import { Field, TextInput } from "./Field";
import { Modal } from "./Modal";

type PromptDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onSubmit: (value: string) => Promise<void> | void;
  onClose: () => void;
};

/** Meminta satu isian singkat (misalnya alasan perubahan) tanpa dialog bawaan browser. */
export function PromptDialog({
  open,
  title,
  description,
  label,
  placeholder,
  confirmLabel = "Simpan",
  cancelLabel = "Batal",
  busy = false,
  onSubmit,
  onClose,
}: PromptDialogProps) {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValue("");
      setError(undefined);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setError("Isi minimal 3 karakter supaya alasannya bisa dipahami orang lain.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setError(undefined);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Belum bisa disimpan. Coba lagi sebentar.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = busy || submitting;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      hideCloseButton={isBusy}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isBusy}>
            {cancelLabel}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isBusy}>
            {isBusy ? "Sedang disimpan…" : confirmLabel}
          </Button>
        </>
      }
    >
      <Field id={inputId} label={label} error={error} required>
        <TextInput
          data-autofocus
          value={value}
          placeholder={placeholder}
          maxLength={500}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(undefined);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleSubmit();
            }
          }}
        />
      </Field>
    </Modal>
  );
}
