import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

interface SonetelAuthResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

interface MakeCallRequest {
  phoneNumber: string;
  recipientNumber: string;
  callerId?: string;
}

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getSonetelAccessToken(): Promise<string> {
  // If using stored token directly from env (no auth flow needed)
  if (process.env.SONETEL_ACCESS_TOKEN && !process.env.SONETEL_USERNAME) {
    return process.env.SONETEL_ACCESS_TOKEN;
  }

  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const authUrl = "https://api.sonetel.com/SonetelAuth/beta/oauth/token";

  try {
    const response = await axios.post(
      authUrl,
      new URLSearchParams({
        grant_type: "password",
        username: process.env.SONETEL_USERNAME!,
        password: process.env.SONETEL_PASSWORD!,
        refresh: "yes",
      }),
      {
        auth: {
          username: "sonetel-api",
          password: "sonetel-api",
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const data: SonetelAuthResponse = response.data;
    cachedToken = data.access_token;
    // Tokens last 24 hours, set expiry to 23 hours for safety
    tokenExpiry = Date.now() + (data.expires_in - 3600) * 1000;

    return cachedToken;
  } catch (error: any) {
    console.error(
      "Error getting Sonetel token:",
      error.response?.data || error.message
    );
    throw new Error("Failed to authenticate with Sonetel");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: MakeCallRequest = await req.json();
    const { phoneNumber, recipientNumber, callerId } = body;

    const appId = process.env.SONETEL_APP_ID;
    const callerNumber =
      phoneNumber ||
      process.env.SONETEL_CALLER_NUMBER ||
      process.env.SONETEL_DEFAULT_CALLER_NUMBER ||
      process.env.NEXT_PUBLIC_DEFAULT_CALLER_NUMBER;

    // Validate required fields
    if (!callerNumber || !recipientNumber) {
      return NextResponse.json(
        { error: "Caller number and recipient number are required" },
        { status: 400 }
      );
    }

    if (!appId) {
      return NextResponse.json(
        { error: "Missing SONETEL_APP_ID environment variable" },
        { status: 500 }
      );
    }

    // Get access token
    const accessToken = await getSonetelAccessToken();

    console.log(`Token:, ${accessToken}`);

    // Make the call via Sonetel Callback API. Try env override first, then beta, then public.
    const callUrls = [
      process.env.SONETEL_CALL_URL,
      "https://beta-api.sonetel.com/make-calls/call/call-back",
      "https://public-api.sonetel.com/make-calls/call/call-back",
    ].filter(Boolean) as string[];

    let callResponse;
    let lastError: any;

    for (const callUrl of callUrls) {
      try {
        callResponse = await axios.post(
          callUrl,
          {
            app_id: appId,
            call1: callerNumber,
            call2: recipientNumber,
            show_1: callerId || callerNumber || "automatic",
            show_2: callerId,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        // Log which URL succeeded for debugging
        console.log(`Sonetel call succeeded via ${callUrl}`);
        break;
      } catch (err: any) {
        lastError = err;
        if (err.response) {
          console.error(
            `Sonetel call failed via ${callUrl}:`,
            err.response.status,
            err.response.statusText,
            err.response.data
          );
        } else {
          console.error(`Sonetel call failed via ${callUrl}:`, err);
        }
      }
    }

    if (!callResponse) {
      throw lastError || new Error("Failed to initiate call (no response)");
    }

    return NextResponse.json(
      {
        success: true,
        callId: callResponse.data.id,
        message: "Call initiated successfully",
        data: callResponse.data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Surface Sonetel's response body when available for easier debugging
    if (error.response) {
      console.error(
        "Error initiating Sonetel call:",
        error.response.status,
        error.response.statusText,
        error.response.data
      );
    } else {
      console.error("Error initiating Sonetel call:", error);
    }

    return NextResponse.json(
      {
        error:
          error.response?.data?.message ||
          error.response?.data ||
          error.message ||
          "Failed to initiate call",
      },
      { status: error.response?.status || 500 }
    );
  }
}
