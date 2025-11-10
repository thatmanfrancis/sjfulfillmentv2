import {
  type LoginData,
  type PasswordLoginData,
  type OtpRequestData,
  type OtpVerificationData,
  type TwoFactorData,
  type EmailCheckData,
  type LoginResponse,
  type UserCheckResponse,
  type LoginError,
  passwordLoginSchema,
  otpRequestSchema,
  otpVerificationSchema,
  twoFactorSchema,
  emailCheckSchema,
  loginSchema,
} from "@/schemas/loginSchema";

class AuthClient {
  private baseUrl = "/api/auth";

  /**
   * Check if user exists and get their preferred auth method
   */
  async checkUser(data: EmailCheckData): Promise<UserCheckResponse> {
    // Validate input
    const validatedData = emailCheckSchema.parse(data);

    const response = await fetch(`${this.baseUrl}/check-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to check user");
    }

    return result;
  }

  /**
   * Attempt login with email and optional password
   * Handles both PASSWORD and OTP authentication methods
   */
  async login(data: LoginData): Promise<LoginResponse> {
    // Validate input
    const validatedData = loginSchema.parse(data);

    const response = await fetch(`${this.baseUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Login failed");
    }

    return result;
  }

  /**
   * Password-based login
   */
  async loginWithPassword(data: PasswordLoginData): Promise<LoginResponse> {
    // Validate input
    const validatedData = passwordLoginSchema.parse(data);

    const response = await fetch(`${this.baseUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Login failed");
    }

    return result;
  }

  /**
   * Request OTP for email-based login
   */
  async requestOtp(data: OtpRequestData): Promise<LoginResponse> {
    // Validate input
    const validatedData = otpRequestSchema.parse(data);

    const response = await fetch(`${this.baseUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to send OTP");
    }

    return result;
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(data: OtpVerificationData): Promise<LoginResponse> {
    // Validate input
    const validatedData = otpVerificationSchema.parse(data);

    const response = await fetch(`${this.baseUrl}/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "OTP verification failed");
    }

    return result;
  }

  /**
   * Verify 2FA code
   */
  async verify2FA(data: TwoFactorData): Promise<LoginResponse> {
    // Validate input
    const validatedData = twoFactorSchema.parse(data);

    const response = await fetch(`${this.baseUrl}/verify-2fa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "2FA verification failed");
    }

    return result;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Token refresh failed");
    }

    return result;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const accessToken = this.getAccessToken();
    
    if (accessToken) {
      try {
        await fetch(`${this.baseUrl}/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.warn("Logout API call failed:", error);
      }
    }

    // Clear local storage regardless of API call success
    this.clearTokens();
  }

  private isRefreshing = false;

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<LoginResponse["user"] | null> {
    const accessToken = this.getAccessToken();
    
    if (!accessToken) {
      return null;
    }

    try {
      const response = await fetch("/api/users/me", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh (but only once at a time)
          if (this.isRefreshing) {
            console.log("Token refresh already in progress, skipping");
            return null;
          }
          
          const refreshToken = this.getRefreshToken();
          if (refreshToken) {
            try {
              this.isRefreshing = true;
              const refreshResult = await this.refreshToken(refreshToken);
              this.setTokensWithCookies(refreshResult.accessToken!, refreshResult.refreshToken!);
              return refreshResult.user || null;
            } catch (error) {
              console.warn("Token refresh failed:", error);
              this.clearTokens();
              return null;
            } finally {
              this.isRefreshing = false;
            }
          }
        }
        return null;
      }

      const result = await response.json();
      return result.user || result;
    } catch (error) {
      console.warn("Failed to get current user:", error);
      return null;
    }
  }

  /**
   * Store authentication tokens
   */
  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
    }
  }

  /**
   * Set tokens in both localStorage and cookies so server-side middleware can read them.
   * Cookies set here are not HttpOnly (client-side). For production, prefer server-set HttpOnly cookies.
   */
  setTokensWithCookies(accessToken: string, refreshToken: string, accessTtlSeconds = 3600, refreshTtlSeconds = 604800): void {
    if (typeof window !== "undefined") {
      this.setTokens(accessToken, refreshToken);

      try {
        const now = new Date();
        const accessExpires = new Date(now.getTime() + accessTtlSeconds * 1000).toUTCString();
        const refreshExpires = new Date(now.getTime() + refreshTtlSeconds * 1000).toUTCString();

        // Set cookies readable by middleware
        document.cookie = `accessToken=${accessToken}; path=/; expires=${accessExpires}; SameSite=Lax`;
        document.cookie = `refreshToken=${refreshToken}; path=/; expires=${refreshExpires}; SameSite=Lax`;
      } catch (e) {
        console.warn("Failed to set cookies for tokens:", e);
      }
    }
  }

  /**
   * Get access token from storage
   */
  getAccessToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accessToken");
    }
    return null;
  }

  /**
   * Get refresh token from storage
   */
  getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refreshToken");
    }
    return null;
  }

  /**
   * Clear authentication tokens
   */
  clearTokens(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      try {
        // Remove cookies by setting expired date
        document.cookie = `accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
        document.cookie = `refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Decode JWT token and extract expiry time
   */
  private decodeToken(token: string): { exp?: number } | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.warn("Failed to decode token:", error);
      return null;
    }
  }

  /**
   * Check if access token is expired or will expire soon (within 5 minutes)
   */
  isTokenExpiringSoon(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;

    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return true;

    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return expiryTime - now < fiveMinutes;
  }

  /**
   * Proactively refresh token if it's expiring soon
   */
  async ensureValidToken(): Promise<boolean> {
    if (!this.isTokenExpiringSoon()) {
      return true; // Token is still valid
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearTokens();
      return false;
    }

    try {
      const result = await this.refreshToken(refreshToken);
      if (result.accessToken && result.refreshToken) {
        this.setTokens(result.accessToken, result.refreshToken);
        return true;
      }
      return false;
    } catch (error) {
      console.warn("Proactive token refresh failed:", error);
      this.clearTokens();
      return false;
    }
  }
}

// Export singleton instance
export const authClient = new AuthClient();
export default authClient;