import "server-only";

import { createCsrf } from "@/lib/server/http/csrf";

export const LIBRARY_EVENTS_CSRF_COOKIE = "pullim-csrf-library-events";
export const LIBRARY_EVENTS_CSRF_HEADER = "x-csrf-token";

export const libraryEventsCsrf = createCsrf({
  cookieName: LIBRARY_EVENTS_CSRF_COOKIE,
});
