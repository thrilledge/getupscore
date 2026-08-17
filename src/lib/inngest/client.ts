import { Inngest } from "inngest";

/**
 * Inngest client — shared across the app.
 * ID matches the Inngest dashboard app name.
 */
export const inngest = new Inngest({
  id: "upscore",
});
