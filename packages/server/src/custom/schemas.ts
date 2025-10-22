import { z } from "zod";
import { getTextFromContent } from "../utils";

const imageContentSchema = z.object({
  type: z.literal("image"),
  attrs: z.object({
    src: z.string().startsWith("http"),
    width: z.number(),
    height: z.number(),
  }),
});

const mentionContentSchema = z.object({
  type: z.literal("mention"),
  attrs: z.object({
    id: z.string(),
    label: z.string().optional(),
  }),
});

export interface RichContentSchema
  extends z.infer<typeof richContentSchemaLeaf> {
  content?: RichContentSchema[];
}

const richContentSchemaLeaf = z
  .object({
    type: z.string(),
    text: z.string().optional(),
  })
  .passthrough();

const richContentSchema: z.ZodType<RichContentSchema> = z.lazy(() =>
  richContentSchemaLeaf.extend({
    content: z.array(richContentSchema).optional(),
  }),
);

export const contentSchema = richContentSchema.superRefine(
  (obj, { addIssue }) => {
    const objString = JSON.stringify(obj);
    let imageCount = 0;
    // TODO: Re-fetch labels in mentions on database adapter
    const text = getTextFromContent(obj, {
      image: (content) => {
        imageCount++;
        const result = imageContentSchema.safeParse(content);

        if (result.success) return `[Image](${result.data.attrs.src})`;
        addIssue({
          code: "custom",
          message: "invalid image element in content",
        });
        return "";
      },
      mention: (content) => {
        const result = mentionContentSchema.safeParse(content);
        if (result.success)
          return `@${result.data.attrs.label ?? result.data.attrs.id}`;

        addIssue({
          code: "custom",
          message: "invalid mention element in content",
        });
        return "";
      },
    }).trim();

    if (text.length === 0) {
      addIssue({ code: "custom", message: "Content can't be empty" });
      return;
    }

    if (text.length > 2000) {
      addIssue({
        code: "custom",
        message: "Content can't be longer than 2000 characters",
      });
    }

    if (imageCount > 2) {
      addIssue({
        code: "custom",
        message: "You cannot add more than 2 images",
      });
    }

    if (objString.length > 2000 * 10) {
      addIssue({
        code: "custom",
        message: "Content is too large",
      });
    }
  },
);

export const updateCommentSchema = z.strictObject({
  content: contentSchema,
});

export const sortSchema = z.enum(["oldest", "newest"]).default("newest");

export const postCommentSchema = z.strictObject({
  content: contentSchema,
  thread: z.string().optional(),
});

export const setRateSchema = z.strictObject({
  like: z.boolean(),
});
