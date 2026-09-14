import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import {
  BRIEF_REF_5190_MAX_BYTES,
  SUPPORTED_AUDIO_FORMATS,
} from "@/constants/limits";

export const maxDuration = 60;

/**
 * Resolves the Vercel Blob read-write token.
 * Supports standard BLOB_READ_WRITE_TOKEN or custom-prefixed store tokens.
 */
export function getBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [key, val] of Object.entries(process.env)) {
    if (key.endsWith("_READ_WRITE_TOKEN") && typeof val === "string") {
      return val;
    }
  }
  return undefined;
}

/** Diagnostic GET endpoint to verify Vercel Blob connection. */
export async function GET(): Promise<NextResponse> {
  const token = getBlobToken();
  const blobKeys = Object.keys(process.env).filter(
    (k) => k.includes("BLOB") || k.endsWith("_READ_WRITE_TOKEN")
  );

  const isConfigured = Boolean(token || process.env.BLOB_STORE_ID);

  return NextResponse.json({
    configured: isConfigured,
    hasToken: Boolean(token),
    hasStoreId: Boolean(process.env.BLOB_STORE_ID),
    hasOidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
    detectedKeys: blobKeys,
    message: isConfigured
      ? "Vercel Blob storage credentials detected."
      : "No Vercel Blob credentials found. Please go to Vercel Dashboard -> Storage -> select your Blob database -> Connect to Project -> select voice-ai, then trigger a Redeploy.",
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const token = getBlobToken();

  if (!token && !process.env.BLOB_STORE_ID) {
    return NextResponse.json(
      {
        error:
          "Vercel Blob storage is not configured (no BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID found).",
      },
      { status: 400 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            ...SUPPORTED_AUDIO_FORMATS,
            "audio/mp3",
          ],
          maximumSizeInBytes: BRIEF_REF_5190_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // Blob successfully uploaded
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[/api/upload] Vercel Blob error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Upload authorization failed." },
      { status: 400 }
    );
  }
}
