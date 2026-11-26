import type { AgentConfig } from "../run";
import { unsupportedNumbers } from "../../post";
import { buildUserInput, SYSTEM_PROMPT, type PostInput } from "./prompt";
import { postAnalysisSchema, type PostAnalysis, type PostResult } from "./schema";

/** LinkedIn post generator. The numbers in the reply are checked against the facts in code. */

export const postAgent: AgentConfig<PostInput, PostAnalysis, PostResult> = {
  id: "post",
  systemPrompt: SYSTEM_PROMPT,
  schema: postAnalysisSchema,
  buildUserInput,
  postProcess: (analysis, input) => ({
    post: analysis.post.trim(),
    hashtags: analysis.hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)),
    unsupportedNumbers: unsupportedNumbers(analysis.post, [...input.facts, input.note].join("\n")),
  }),
};
