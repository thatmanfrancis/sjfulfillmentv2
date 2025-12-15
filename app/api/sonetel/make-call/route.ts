import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

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
  let userId = null;
  let userRole = null;
  try {
    // Try to extract user from session cookie (JWT)
    const sessionToken = req.cookies.get("session")?.value;
    if (sessionToken) {
      try {
        const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret";
        const session = jwt.verify(sessionToken, JWT_SECRET) as any;
        userId = session.userId;
        userRole = session.role;
      } catch (e) {
        // Ignore, treat as unauthenticated
      }
    }

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
      await prisma.callLog.create({
        data: {
          userId,
          role: userRole,
          fromNumber: callerNumber || "",
          toNumber: recipientNumber || "",
          status: "error",
          message: "Caller number and recipient number are required",
        },
      });
      return NextResponse.json(
        { error: "Caller number and recipient number are required" },
        { status: 400 }
      );
    }

    if (!appId) {
      await prisma.callLog.create({
        data: {
          userId,
          role: userRole,
          fromNumber: callerNumber,
          toNumber: recipientNumber,
          status: "error",
          message: "Missing SONETEL_APP_ID environment variable",
        },
      });
      return NextResponse.json(
        { error: "Missing SONETEL_APP_ID environment variable" },
        { status: 500 }
      );
    }

    // Get access token
    const accessToken = await getSonetelAccessToken();

    // Make the call via Sonetel Callback API. Try env override first, then beta, then public.
    const callUrls = [
      process.env.SONETEL_CALL_URL,
      "https://beta-api.sonetel.com/make-calls/call/call-back",
      "https://public-api.sonetel.com/make-calls/call/call-back",
    ].filter(Boolean) as string[];

    let callResponse;
    let lastError: any;
    let callId: string | undefined = undefined;
    let callStatus = "error";
    let callMessage = "";
    let callError = "";

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
        callId = callResponse.data.id;
        callStatus = "success";
        callMessage = "Call initiated successfully";
        break;
      } catch (err: any) {
        lastError = err;
        callError =
          err?.response?.data?.message || err?.message || "Unknown error";
      }
    }

    // Log the call attempt
    await prisma.callLog.create({
      data: {
        userId,
        role: userRole,
        fromNumber: callerNumber,
        toNumber: recipientNumber,
        callId,
        status: callStatus,
        message: callStatus === "success" ? callMessage : undefined,
        error: callStatus === "error" ? callError : undefined,
      },
    });

    if (callStatus !== "success") {
      throw lastError || new Error("Failed to initiate call (no response)");
    }

    return NextResponse.json(
      {
        success: true,
        callId,
        message: callMessage,
        data: callResponse.data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Log failed call if not already logged
    if (req) {
      try {
        const body = req.body ? await req.json() : {};
        await prisma.callLog.create({
          data: {
            userId,
            role: userRole,
            fromNumber: body?.phoneNumber || "",
            toNumber: body?.recipientNumber || "",
            status: "error",
            error: error?.message || "Failed to initiate call",
          },
        });
      } catch (e) {}
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
