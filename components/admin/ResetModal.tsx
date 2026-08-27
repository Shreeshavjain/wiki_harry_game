"use client";

interface ResetModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

/**
 * Confirmation modal for starting a new round.
 * Preserves the original warning text.
 */
export default function ResetModal({
  onConfirm,
  onCancel,
  loading,
}: ResetModalProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[0.92rem] mb-4.5">
          Start a <strong>new round</strong>? This resets all house counts to 0.
          Past rosters are kept in the database but hidden from view.
        </p>
        <div className="flex gap-2.5 justify-center">
          <button
            className="small-btn"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="small-btn danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Resetting..." : "Yes, Reset"}
          </button>
        </div>
      </div>
    </div>
  );
}
