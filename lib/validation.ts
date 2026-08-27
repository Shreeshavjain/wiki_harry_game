/**
 * Server-side input validation for participant sorting.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: { name: string; usn: string };
}

const NAME_MIN = 1;
const NAME_MAX = 40;
const USN_MIN = 1;
const USN_MAX = 20;

// Allow alphanumeric, spaces, hyphens, apostrophes, periods in names
const NAME_PATTERN = /^[a-zA-Z\s'\-.]+$/;

// Allow alphanumeric and common USN characters
const USN_PATTERN = /^[a-zA-Z0-9\-_]+$/;

export function validateParticipantInput(
  name: unknown,
  usn: unknown
): ValidationResult {
  const errors: string[] = [];

  if (typeof name !== "string" || !name.trim()) {
    errors.push("Name is required");
  }

  if (typeof usn !== "string" || !usn.trim()) {
    errors.push("USN is required");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const trimmedName = (name as string).trim();
  const trimmedUsn = (usn as string).trim().toUpperCase();

  if (trimmedName.length < NAME_MIN || trimmedName.length > NAME_MAX) {
    errors.push(`Name must be between ${NAME_MIN} and ${NAME_MAX} characters`);
  }

  if (!NAME_PATTERN.test(trimmedName)) {
    errors.push("Name can only contain letters, spaces, hyphens, apostrophes, and periods");
  }

  if (trimmedUsn.length < USN_MIN || trimmedUsn.length > USN_MAX) {
    errors.push(`USN must be between ${USN_MIN} and ${USN_MAX} characters`);
  }

  if (!USN_PATTERN.test(trimmedUsn)) {
    errors.push("USN can only contain letters, numbers, hyphens, and underscores");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: { name: trimmedName, usn: trimmedUsn },
  };
}

export function validatePassword(password: unknown): boolean {
  return typeof password === "string" && password.length > 0;
}
