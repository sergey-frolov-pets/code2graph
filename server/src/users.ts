import type Database from "better-sqlite3";
import { hashPassword, verifyPassword } from "./auth/password.js";
import type { UserDto, UserRow } from "./types.js";

export function mapUser(row: UserRow): UserDto {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    blocked: row.blocked === 1,
    subscriptionActive: row.subscription_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getUserById(
  database: Database.Database,
  userId: string,
): UserDto | null {
  const row = database
    .prepare(
      `SELECT id, username, password_hash, role, blocked, subscription_active,
              created_at, updated_at
       FROM users WHERE id = ?`,
    )
    .get(userId) as UserRow | undefined;

  return row ? mapUser(row) : null;
}

export function getUserByUsername(
  database: Database.Database,
  username: string,
): UserRow | null {
  const row = database
    .prepare(
      `SELECT id, username, password_hash, role, blocked, subscription_active,
              created_at, updated_at
       FROM users WHERE username = ?`,
    )
    .get(username) as UserRow | undefined;

  return row ?? null;
}

export async function authenticateUser(
  database: Database.Database,
  username: string,
  password: string,
): Promise<UserDto | null> {
  const row = getUserByUsername(database, username);
  if (!row || row.blocked === 1) {
    return null;
  }

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) {
    return null;
  }

  return mapUser(row);
}

export async function createUser(
  database: Database.Database,
  username: string,
  password: string,
  role: UserRow["role"] = "user",
): Promise<UserDto> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  database
    .prepare(
      `INSERT INTO users (
        id, username, password_hash, role, blocked, subscription_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, 0, ?, ?)`,
    )
    .run(id, username, passwordHash, role, now, now);

  return getUserById(database, id)!;
}

export function listUsers(database: Database.Database): UserDto[] {
  const rows = database
    .prepare(
      `SELECT id, username, password_hash, role, blocked, subscription_active,
              created_at, updated_at
       FROM users
       ORDER BY username ASC`,
    )
    .all() as UserRow[];

  return rows.map(mapUser);
}

export function setUserBlocked(
  database: Database.Database,
  userId: string,
  blocked: boolean,
): UserDto | null {
  const now = new Date().toISOString();
  const result = database
    .prepare("UPDATE users SET blocked = ?, updated_at = ? WHERE id = ?")
    .run(blocked ? 1 : 0, now, userId);

  if (result.changes === 0) {
    return null;
  }

  return getUserById(database, userId);
}

export function setUserSubscription(
  database: Database.Database,
  userId: string,
  subscriptionActive: boolean,
): UserDto | null {
  const now = new Date().toISOString();
  const result = database
    .prepare(
      "UPDATE users SET subscription_active = ?, updated_at = ? WHERE id = ?",
    )
    .run(subscriptionActive ? 1 : 0, now, userId);

  if (result.changes === 0) {
    return null;
  }

  return getUserById(database, userId);
}
