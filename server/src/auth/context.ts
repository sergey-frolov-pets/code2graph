import type { Context } from "hono";
import type { UserDto } from "../types.js";

export type AuthVariables = {
  user: UserDto | null;
};

export function getRequestUser(context: Context<{ Variables: AuthVariables }>): UserDto | null {
  return context.get("user");
}

export function requireRequestUser(
  context: Context<{ Variables: AuthVariables }>,
): UserDto | null {
  const user = getRequestUser(context);
  if (!user) {
    return null;
  }
  return user;
}
