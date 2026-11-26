import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy | CareerOS",
  description: "What CareerOS does and does not store about you.",
};

// Shown on the page as the contact address. Change it here if you want another one.
const CONTACT_EMAIL = "fathnajath@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">
        ← Back to CareerOS
      </Link>

      <article className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-white/80 sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Privacy policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated 26 November 2026</p>

        <p className="mt-6 leading-relaxed text-slate-700">
          CareerOS is a student project that reviews resumes and prepares people for interviews. It
          works without an account. Signing in is optional.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-slate-900">What you type into the app</h2>
        <p className="mt-2 leading-relaxed text-slate-700">
          Your resume, LinkedIn text, job descriptions and interview answers are sent to Google&apos;s
          Gemini API so it can write the review. CareerOS does not save this text on its servers and
          does not write it to logs. Your resume stays in your own browser and is never uploaded to
          your account.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-slate-900">If you do not sign in</h2>
        <p className="mt-2 leading-relaxed text-slate-700">
          Your score history and job tracker are kept in this browser only. Clearing your browser data
          removes them.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-slate-900">If you sign in with Google</h2>
        <p className="mt-2 leading-relaxed text-slate-700">
          CareerOS asks Google only for your name and email address, which are used to sign you in.
          It then saves your score history and job tracker to your account so they appear on your
          other devices. Each person can read only their own rows. You can remove everything with the
          Delete my saved data button on the Progress tab. CareerOS does not sell or share this data.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-slate-900">Emailed reports</h2>
        <p className="mt-2 leading-relaxed text-slate-700">
          If you tick the consent box and ask for a plan by email, your email address and the scores
          or report you chose to send are passed to an automation that sends the message and logs one
          row. Nothing is sent unless you tick the box.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-slate-900">Services used</h2>
        <p className="mt-2 leading-relaxed text-slate-700">
          Google Gemini (writes the reviews), Supabase (sign-in and saved scores), Vercel (hosting)
          and, for emailed reports, n8n with Google Sheets and Gmail.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-slate-900">Contact</h2>
        <p className="mt-2 leading-relaxed text-slate-700">
          Questions or deletion requests: {CONTACT_EMAIL}
        </p>

        <p className="mt-8 text-sm text-slate-500">
          CareerOS scores are an AI-assisted opinion, not a hiring decision.
        </p>
      </article>
    </main>
  );
}
