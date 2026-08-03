import { http, toQuery } from "./http";

export const usersService = {
  search: (params) => http.get(`/users/search${toQuery(params)}`),
  get: (id) => http.get(`/users/${id}`),

  friends: () => http.get("/users/me/friends"),
  requests: () => http.get("/users/me/requests"),
  myEvents: () => http.get("/users/me/events"),

  sendRequest: (id) => http.post(`/users/${id}/friend-request`),
  cancelRequest: (id) => http.del(`/users/${id}/friend-request`),
  accept: (id) => http.post(`/users/${id}/friend-request/accept`),
  reject: (id) => http.post(`/users/${id}/friend-request/reject`),
  unfriend: (id) => http.del(`/users/${id}/friend`),

  updateProfile: (fields) => http.patch("/users/me", fields),

  preferences: () => http.get("/users/me/preferences"),
  savePreferences: (prefs) => http.put("/users/me/preferences", prefs),
};
