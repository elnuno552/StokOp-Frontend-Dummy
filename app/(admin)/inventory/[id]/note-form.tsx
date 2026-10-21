"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, input, label } from "@/components/ui/styles";
import { addNoteAction, type NoteFormState } from "./actions";
import { NOTE_MAX_LENGTH } from "@/validations/note";

export function NoteForm({ itemId }: { itemId: string }) {
  const [state, action] = useActionState<NoteFormState, FormData>(addNoteAction.bind(null, itemId), {});
  return (
    <form action={action} key={state.saved ?? "new"} className="flex flex-col gap-2">
      <label htmlFor="note-content" className={label}>
        Tambah catatan
      </label>
      <textarea
        id="note-content"
        name="content"
        rows={3}
        maxLength={NOTE_MAX_LENGTH}
        required
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "note-error" : undefined}
        className={`${input} py-2`}
      />
      {state.error && (
        <p id="note-error" role="alert" className={fieldError}>
          {state.error}
        </p>
      )}
      <div>
        <SubmitButton pendingLabel="Menyimpan…">Simpan catatan</SubmitButton>
      </div>
    </form>
  );
}
