import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import {
  BRIEF_REF_5190_MAX_BYTES,
  SUPPORTED_AUDIO_FORMATS,
} from "@/constants/limits";

export const maxDuration = 60;

/** Diagnostic GET endpoint to verify Vercel Blob connection. */
export async function GET(): Promise<NextResponse> {
  const hasToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  return NextResponse.json({
    configured: hasToken,
    message: hasToken
      ? "Vercel Blob storage is properly connected and ready."
      : "BLOB_READ_WRITE_TOKEN is missing. Please go to Vercel Dashboard -> Storage -> select your Blob database -> Connect to Project, then Redeploy.",
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Vercel Blob storage is not configured (missing BLOB_READ_WRITE_TOKEN).",
      },
      { status: 501 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
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
        // Blob is stored and ready for analysis
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
