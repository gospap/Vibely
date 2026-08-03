import { http, toQuery } from "./http";

export const eventsService = {
  // Returns { items, page, limit, total, hasMore } — only events that have not
  // finished yet, soonest first.
  list: (params) => http.get(`/events${toQuery(params)}`),
  genres: () => http.get("/events/genres"),
  get: (id) => http.get(`/events/${id}`),
  attend: (id) => http.post(`/events/${id}/attend`),
  leave: (id) => http.del(`/events/${id}/attend`),
};
