import { authClient } from "@/lib/auth-client";

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Enhanced fetch wrapper that automatically handles authentication
 */
export async function apiCall<T = any>(
  url: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { requireAuth = true, headers = {}, ...fetchOptions } = options;

  // Prepare headers
  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers,
  } as Record<string, string>;

  // Add authorization header if required
  if (requireAuth) {
    // Proactively refresh token if it's expiring soon
    const tokenValid = await authClient.ensureValidToken();
    if (!tokenValid) {
      // Token refresh failed, redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return {
        ok: false,
        status: 401,
        error: "Authentication required",
      };
    }

    const accessToken = authClient.getAccessToken();
    if (accessToken) {
      requestHeaders["Authorization"] = `Bearer ${accessToken}`;
    } else {
      return {
        ok: false,
        status: 401,
        error: "No access token available",
      };
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
    });

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // Handle 401 (Unauthorized) by attempting token refresh
      if (response.status === 401 && requireAuth) {
        const refreshToken = authClient.getRefreshToken();
        if (refreshToken) {
          try {
            const refreshResult = await authClient.refreshToken(refreshToken);
            if (refreshResult.accessToken && refreshResult.refreshToken) {
              authClient.setTokens(refreshResult.accessToken, refreshResult.refreshToken);
              
              // Retry the original request with new token
              requestHeaders["Authorization"] = `Bearer ${refreshResult.accessToken}`;
              const retryResponse = await fetch(url, {
                ...fetchOptions,
                headers: requestHeaders,
              });

              let retryData;
              const retryContentType = retryResponse.headers.get("content-type");
              if (retryContentType && retryContentType.includes("application/json")) {
                retryData = await retryResponse.json();
              } else {
                retryData = await retryResponse.text();
              }

              return {
                ok: retryResponse.ok,
                status: retryResponse.status,
                data: retryResponse.ok ? retryData : undefined,
                error: retryResponse.ok ? undefined : (retryData?.error || `HTTP ${retryResponse.status}`),
              };
            }
          } catch (refreshError) {
            console.warn("Token refresh failed:", refreshError);
            // Clear tokens and redirect to login
            authClient.clearTokens();
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
          }
        } else {
          // No refresh token, redirect to login
          authClient.clearTokens();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
      }

      return {
        ok: false,
        status: response.status,
        error: data?.error || data?.message || `HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (error) {
    console.error("API call failed:", error);
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = any>(url: string, options: Omit<ApiOptions, "method"> = {}) =>
    apiCall<T>(url, { ...options, method: "GET" }),

  post: <T = any>(url: string, data?: any, options: Omit<ApiOptions, "method" | "body"> = {}) =>
    apiCall<T>(url, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(url: string, data?: any, options: Omit<ApiOptions, "method" | "body"> = {}) =>
    apiCall<T>(url, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(url: string, data?: any, options: Omit<ApiOptions, "method" | "body"> = {}) =>
    apiCall<T>(url, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(url: string, options: Omit<ApiOptions, "method"> = {}) =>
    apiCall<T>(url, { ...options, method: "DELETE" }),
};

export default api;