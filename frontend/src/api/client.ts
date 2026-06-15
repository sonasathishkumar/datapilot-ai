import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'https://datapilot-ai-backend.onrender.com/api',
  // Do NOT set a global Content-Type here.
  // JSON requests will use 'application/json' by default.
  // FormData requests (LLM endpoints) need 'multipart/form-data' with a boundary,
  // which the browser sets automatically when Content-Type is not forced.
});
