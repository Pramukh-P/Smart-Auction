// The backend also issues an httpOnly cookie, but since the frontend
// (vercel.app) and backend (onrender.com) are on different domains, that
// cookie is a "third-party cookie" from the browser's point of view — and a
// growing number of browsers/users block those by default (Safari and
// Firefox have for years; Chrome is rolling it out too). When that happens,
// the cookie silently never gets sent back, and every authenticated request
// fails with 401 even though the person just logged in successfully.
//
// To make login work regardless of third-party cookie settings, the backend
// also returns the JWT directly in the login/register/Google response body.
// We store that in localStorage and send it as a normal `Authorization:
// Bearer <token>` header on every request — a first-party mechanism that
// isn't subject to third-party cookie blocking at all. The cookie is kept
// too, as a harmless fallback for browsers that do accept it.

const KEY = "sa_token";

export const getToken = (): string | null => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};

export const setToken = (token: string): void => {
  try { localStorage.setItem(KEY, token); } catch { /* ignore (private mode, storage disabled, etc.) */ }
};

export const clearToken = (): void => {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
};
