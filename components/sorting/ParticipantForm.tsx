"use client";

import { useState } from "react";

interface ParticipantFormProps {
  onSubmit: (name: string, usn: string) => void;
  disabled: boolean;
  totalSorted: number;
}

/**
 * Name + USN input form for participants.
 * Matches the original form layout and validation behavior.
 */
export default function ParticipantForm({
  onSubmit,
  disabled,
  totalSorted,
}: ParticipantFormProps) {
  const [name, setName] = useState("");
  const [usn, setUsn] = useState("");

  const isValid = name.trim().length > 0 && usn.trim().length > 0;

  function handleSubmit() {
    if (!isValid || disabled) return;
    onSubmit(name.trim(), usn.trim());
  }

  return (
    <div className="flex flex-col items-center gap-3.5">
      <input
        type="text"
        className="magic-input"
        placeholder="Your name"
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        disabled={disabled}
        id="nameInput"
      />
      <input
        type="text"
        className="magic-input"
        placeholder="Your USN"
        maxLength={20}
        value={usn}
        onChange={(e) => setUsn(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        disabled={disabled}
        id="usnInput"
      />
      <button
        className="btn-magic mt-1"
        disabled={!isValid || disabled}
        onClick={handleSubmit}
        id="sortBtn"
      >
        Let the Magic Decide
      </button>
      <p className="text-[0.78rem] text-parchment/40 italic pt-3.5 mt-auto">
        {totalSorted > 0
          ? `${totalSorted} wizards have joined the journey so far`
          : "Be among the first to be sorted"}
      </p>
    </div>
  );
}
