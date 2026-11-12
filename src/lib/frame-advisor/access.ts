import "server-only";
import { cache } from "react";
import { frameAdvisorProviderConfigured } from "./provider";
import { isFrameAdvisorPilot } from "./store";

export const canUseFrameAdvisor = cache(async (userId: string) => {
  if (process.env.CLIENT_FRAME_ADVISOR_ENABLED !== "true" || !frameAdvisorProviderConfigured()) return false;
  return isFrameAdvisorPilot(userId).catch(() => false);
});
