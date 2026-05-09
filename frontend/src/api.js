import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const createNewChat = () =>
  axios.post(`${BASE}/api/chat/new`).then((r) => r.data.chatId);

export const sendMessage = (chatId, message) =>
  axios.post(`${BASE}/api/chat/${chatId}/message`, { message }).then((r) => r.data.reply);

export const uploadDocument = (chatId, file) => {
  const fd = new FormData();
  fd.append("file", file);
  return axios.post(`${BASE}/api/chat/${chatId}/upload/document`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};

export const uploadImage = (chatId, file) => {
  const fd = new FormData();
  fd.append("file", file);
  return axios.post(`${BASE}/api/chat/${chatId}/upload/image`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};
