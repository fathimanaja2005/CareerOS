/**
 * Removes email addresses and phone numbers from text before it is analysed.
 * Used on uploaded resume and LinkedIn files so students never have to edit
 * their own text by hand. It only removes contact details; everything else is
 * left exactly as written. Not a guarantee: addresses and other personal
 * details are not detected, so the privacy note still applies.
 */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// A run of digits with spaces, dashes, dots or brackets, optionally starting with "+".
const PHONE = /\+?\d[\d\s().-]{8,}\d/g;

export type RedactResult = { text: string; emails: number; phones: number };

export function redactContacts(input: string): RedactResult {
  let emails = 0;
  let phones = 0;

  let text = input.replace(EMAIL, () => {
    emails += 1;
    return "[email removed]";
  });

  text = text.replace(PHONE, (match) => {
    const digits = match.replace(/\D/g, "").length;
    // Real phone numbers have 10 to 13 digits. Date ranges and scores do not.
    if (digits < 10 || digits > 13) return match;
    // Leave a run of years such as "2021 2022 2023" alone.
    if (/^(?:(?:19|20)\d{2}[\s.-]+){2,}(?:19|20)\d{2}$/.test(match.trim())) return match;
    phones += 1;
    return "[phone removed]";
  });

  return { text, emails, phones };
}
