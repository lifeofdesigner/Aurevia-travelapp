import {NextResponse} from "next/server";
import {z, ZodError} from "zod";

import {
  errorResponse,
  getLiveChatToken,
  getOptionalUserId
} from "@/server/live-chat/http";
import {uploadLiveChatAttachmentForVisitor} from "@/server/live-chat/service";

const uploadSchema = z.object({
  conversationId: z.string().uuid()
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({message: "A file is required."}, {status: 400});
    }

    const input = uploadSchema.parse({
      conversationId: formData.get("conversationId")
    });
    const userId = await getOptionalUserId();
    const attachment = await uploadLiveChatAttachmentForVisitor({
      conversationId: input.conversationId,
      file,
      token: getLiveChatToken(request),
      userId
    });

    return NextResponse.json(attachment, {status: 201});
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {message: error.issues[0]?.message ?? "Invalid attachment upload."},
        {status: 400}
      );
    }

    return errorResponse(error, "Unable to upload attachment.");
  }
}
