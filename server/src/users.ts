import type Database from "better-sqlite3";
import { hashPassword, verifyPassword } from "./auth/password.js";
import type { UserDto, UserRole, UserRow } from "./types.js";

const MIN_USERNAME_LENGTH = 2;
const MIN_PASSWORD_LENGTH = 6;

export function countUsers(database: Database.Database): number {
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM users")
    .get() as { count: number };
  return row.count;
}

export function needsSetup(database: Database.Database): boolean {
  return countUsers(database) === 0;
}

export function countAdmins(database: Database.Database): number {
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'")
    .get() as { count: number };
  return row.count;
}

function validateUsername(username: string): string {
  const trimmed = username.trim();
  if (trimmed.length < MIN_USERNAME_LENGTH) {
    throw new Error("Логин должен содержать минимум 2 символа");
  }
  return trimmed;
}

function validatePassword(password: string): string {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error("Пароль должен содержать минимум 6 символов");
  }
  return password;
}

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
  role: UserRole = "user",
  subscriptionActive = false,
): Promise<UserDto> {
  const normalizedUsername = validateUsername(username);
  validatePassword(password);

  if (getUserByUsername(database, normalizedUsername)) {
    throw new Error("Пользователь с таким логином уже существует");
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  database
    .prepare(
      `INSERT INTO users (
        id, username, password_hash, role, blocked, subscription_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
    )
    .run(
      id,
      normalizedUsername,
      passwordHash,
      role,
      subscriptionActive ? 1 : 0,
      now,
      now,
    );

  return getUserById(database, id)!;
}

export async function updateUser(
  database: Database.Database,
  userId: string,
  patch: {
    username?: string;
    password?: string;
    role?: UserRole;
    blocked?: boolean;
    subscriptionActive?: boolean;
  },
): Promise<UserDto | null> {
  const existing = database
    .prepare("SELECT id, username, role FROM users WHERE id = ?")
    .get(userId) as { id: string; username: string; role: UserRole } | undefined;

  if (!existing) {
    return null;
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (patch.username !== undefined) {
    const normalizedUsername = validateUsername(patch.username);
    if (normalizedUsername !== existing.username) {
      if (getUserByUsername(database, normalizedUsername)) {
        throw new Error("Пользователь с таким логином уже существует");
      }
      updates.push("username = ?");
      values.push(normalizedUsername);
    }
  }

  if (patch.password !== undefined && patch.password.length > 0) {
    validatePassword(patch.password);
    const passwordHash = await hashPassword(patch.password);
    updates.push("password_hash = ?");
    values.push(passwordHash);
  }

  if (patch.role !== undefined) {
    if (patch.role !== "admin" && patch.role !== "user") {
      throw new Error("Недопустимая роль");
    }
    if (existing.role === "admin" && patch.role !== "admin") {
      const admins = countAdmins(database);
      if (admins <= 1) {
        throw new Error("Нельзя убрать роль admin у последнего администратора");
      }
    }
    updates.push("role = ?");
    values.push(patch.role);
  }

  if (patch.blocked !== undefined) {
    updates.push("blocked = ?");
    values.push(patch.blocked ? 1 : 0);
  }

  if (patch.subscriptionActive !== undefined) {
    updates.push("subscription_active = ?");
    values.push(patch.subscriptionActive ? 1 : 0);
  }

  if (updates.length === 0) {
    return getUserById(database, userId);
  }

  const now = new Date().toISOString();
  updates.push("updated_at = ?");
  values.push(now);
  values.push(userId);

  database
    .prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
    .run(...values);

  return getUserById(database, userId);
}

export function deleteUser(
  database: Database.Database,
  userId: string,
): { deleted: boolean; error?: string } {
  const existing = database
    .prepare("SELECT id, role FROM users WHERE id = ?")
    .get(userId) as { id: string; role: UserRole } | undefined;

  if (!existing) {
    return { deleted: false };
  }

  if (existing.role === "admin" && countAdmins(database) <= 1) {
    return {
      deleted: false,
      error: "Нельзя удалить последнего администратора",
    };
  }

  const transaction = database.transaction(() => {
    database
      .prepare("DELETE FROM diagram_versions WHERE author_id = ?")
      .run(userId);
    database
      .prepare("UPDATE diagrams SET author_id = NULL WHERE author_id = ?")
      .run(userId);
    database
      .prepare("UPDATE sections SET author_id = NULL WHERE author_id = ?")
      .run(userId);
    database.prepare("DELETE FROM sections WHERE owner_id = ?").run(userId);
    const result = database.prepare("DELETE FROM users WHERE id = ?").run(userId);
    return result.changes > 0;
  });

  return { deleted: transaction() };
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
