import { http, toQuery } from "./http";

export const CATEGORIES = [
  { key: "all", label: "Όλα" },
  { key: "bar", label: "Bars" },
  { key: "club", label: "Clubs" },
  { key: "live", label: "Live" },
  { key: "rooftop", label: "Rooftops" },
  { key: "cafe", label: "Cafés" },
  { key: "beach", label: "Beach" },
];

export const storesService = {
  list: (params) => http.get(`/stores${toQuery(params)}`),
  get: (id) => http.get(`/stores/${id}`),
  events: (id) => http.get(`/stores/${id}/events`),
  reviews: (id, params) => http.get(`/stores/${id}/reviews${toQuery(params)}`),
  review: (id, { rating, comment }) =>
    http.post(`/stores/${id}/reviews`, { rating, comment }),
  removeReview: (id) => http.del(`/stores/${id}/reviews`),
  toggleSave: (id) => http.post(`/stores/${id}/save`),
};
