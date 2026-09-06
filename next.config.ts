import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The planner's screens were named `/plans` before they were named
   * `/rencana`, and a URL that has been in somebody's address bar is a promise
   * — a pengurus with the old link bookmarked must land on the plan, not on a
   * 404 that reads as "the feature is gone".
   *
   * Permanent (308), because the old paths are not coming back, and ordered
   * with the literal child ahead of the dynamic one: `/plans/propose` would
   * otherwise match `:id` and redirect to `/rencana/propose`, which does not
   * exist. Query strings ride along on their own, so `?season=` survives.
   *
   * The API paths these screens call are `/api/plans*` and are untouched by
   * any of this: that name is the backend's contract, not a display choice.
   */
  async redirects() {
    return [
      { source: "/plans", destination: "/rencana", permanent: true },
      { source: "/plans/propose", destination: "/rencana/susun", permanent: true },
      { source: "/plans/:id", destination: "/rencana/:id", permanent: true },
    ];
  },
};

export default nextConfig;
