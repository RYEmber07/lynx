# Lynx API Reference

All requests to `/api/*` endpoints (except some auth and health) expect JSON payloads and return JSON responses. Success responses (200, 201) return the data directly without a generic wrapper.

## Error Format

All error responses (400, 401, 404, 409, 500) return a JSON object containing an `error` key with a human-readable string message. Zod validation errors (400) additionally contain an `errors` object mapping field names to an array of error strings.

**Standard Error**
```json
{ "error": "Invalid credentials" }
```

**Validation Error**
```json
{
  "error": "Validation failed",
  "errors": {
    "email": ["Invalid email address"]
  }
}
```

---

## Auth Endpoints

### POST `/api/auth/register`
Creates a new user account.
- **Body:** `{ email, password, name? }`
- **Success (201):** `{ accessToken, user: { id, email, name } }` (Sets `refreshToken` cookie)
- **Errors:** 400 (Validation), 409 (Email already in use)

### POST `/api/auth/login`
Authenticates a user.
- **Body:** `{ email, password }`
- **Success (200):** `{ accessToken, user: { id, email, name } }` (Sets `refreshToken` cookie)
- **Errors:** 400 (Validation), 401 (Invalid credentials)

### POST `/api/auth/refresh`
Rotates the refresh token (reads `refreshToken` cookie).
- **Success (200):** `{ accessToken, user: { id, email, name } }` (Sets new `refreshToken` cookie)
- **Errors:** 401 (Unauthorized / invalid cookie)

### POST `/api/auth/logout`
Logs out user and clears `refreshToken` cookie.
- **Success (200):** `{ message: "Logged out" }`

---

## URL Endpoints

All URL endpoints require authentication via `Bearer <accessToken>`.

### POST `/api/urls`
Creates a new shortened URL.
- **Body:** `{ originalUrl, customSlug?, expiresAt?, isPasswordProtected?, password? }`
- **Success (201):** Returns full `UrlModel` object
- **Errors:** 400 (Validation / missing password), 409 (Custom slug taken)

### GET `/api/urls`
Returns all URLs belonging to the authenticated user.
- **Success (200):** Array of `UrlModel` objects

### PATCH `/api/urls/:id`
Updates a URL. Only the owner can modify it.
- **Body:** `{ originalUrl?, customSlug?, expiresAt?, isActive?, isPasswordProtected?, password? }`
- **Success (200):** Returns updated `UrlModel`
- **Errors:** 400 (Validation), 403 (Forbidden / not owner), 404 (Not found)

### DELETE `/api/urls/:id`
Deletes a URL.
- **Success (204):** No content
- **Errors:** 403 (Forbidden), 404 (Not found)

---

## Analytics Endpoints

All analytics endpoints require authentication and ownership of the URL.
Base path: `/api/urls/:id/analytics`

### GET `/api/urls/:id/analytics`
- **Query:** `?days=7|30|90` (default 30)
- **Success (200):** Returns full analytics summary

### GET `/api/urls/:id/analytics/clicks`
- **Query:** `?days=<number>` (default 30)
- **Success (200):** `{ clicks: [...] }`

### GET `/api/urls/:id/analytics/devices`
- **Success (200):** `{ devices: [...] }`

### GET `/api/urls/:id/analytics/browsers`
- **Success (200):** `{ browsers: [...] }`

### GET `/api/urls/:id/analytics/countries`
- **Query:** `?limit=<number>` (default 10, max 50)
- **Success (200):** `{ countries: [...] }`

---

## Redirect Endpoints

### GET `/:code`
Resolves a short code or custom slug and redirects the client.
- **Success (302):** Redirects to `originalUrl`. If password protected, redirects to frontend verify page (`/verify/:code`).
- **Errors:** 404 (Not found)

### POST `/:code/verify`
Verifies a password for a protected URL.
- **Body:** `{ password }`
- **Success (200):** `{ originalUrl }`
- **Errors:** 400 (Not protected), 401 (Wrong password), 404 (Not found), 410 (Expired/inactive)

---

### Handling Errors in the Frontend

When catching errors from the `api` (axios instance) in the frontend, use the following pattern:

```typescript
import { isAxiosError } from "axios";

try {
  // ... api call ...
} catch (err) {
  if (isAxiosError(err)) {
    const data = err.response?.data as { 
      error?: string; 
      errors?: Record<string, string[]> 
    } | undefined;
    
    if (data?.errors) {
      const messages = Object.values(data.errors).flat();
      setError(messages.join(" | "));
    } else if (data?.error) {
      setError(data.error);
    } else {
      setError("Request failed");
    }
  } else {
    setError(err instanceof Error ? err.message : "Request failed");
  }
}
```
