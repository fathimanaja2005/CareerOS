import type { AgentConfig } from "../run";
import { postProcessTailor } from "./check";
import { buildUserInput, SYSTEM_PROMPT, type TailorInput } from "./prompt";
import { tailorAnalysisSchema, type TailorAnalysis, type TailorResult } from "./schema";

/** Tailor agent: job-specific rewrites and a cover letter. See check.ts for the code-side checks. */

export const tailorAgent: AgentConfig<TailorInput, TailorAnalysis, TailorResult> = {
  id: "tailor",
  systemPrompt: SYSTEM_PROMPT,
  schema: tailorAnalysisSchema,
  buildUserInput,
  postProcess: postProcessTailor,
};
