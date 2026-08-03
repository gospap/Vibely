import { http, toQuery } from "./http";

export const messagesService = {
  // One row per friend, most recent thread first. Friends with no history are
  // included, so this doubles as the "start a chat" list.
  conversations: () => http.get("/messages/conversations"),
  unreadCount: () => http.get("/messages/unread-count"),

  thread: (userId, params) => http.get(`/messages/${userId}${toQuery(params)}`),
  send: (userId, { text, imageUrl }) =>
    http.post(`/messages/${userId}`, { text, imageUrl }),
  markRead: (userId) => http.post(`/messages/${userId}/read`),
};
