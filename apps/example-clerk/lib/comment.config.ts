import { auth } from "@clerk/nextjs/server";
import { ClerkAdapter } from "@fuma-comment/server/adapters/clerk";
import { createDrizzleAdapter } from "@fuma-comment/server/adapters/drizzle";
import { comments, rates, roles } from "@/lib/schema";
import { db } from "./database";

export const clerkAdapter = ClerkAdapter(() => auth());

export const storage = createDrizzleAdapter({
	db,
	schemas: {
		comments,
		rates,
		roles,
	},
	auth: clerkAdapter,
});
