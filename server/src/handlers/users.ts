import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput, type ResetPasswordInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

// Simple password hashing function (in production, use bcrypt or similar)
function hashPassword(password: string): string {
  // This is a simple hash for demonstration - use bcrypt in production
  return Buffer.from(password).toString('base64');
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash the password before storing
    const hashedPassword = hashPassword(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        nama: input.nama,
        email: input.email,
        password: hashedPassword,
        role: input.role,
        kelas: input.kelas || null
      })
      .returning()
      .execute();

    const user = result[0];
    return {
      ...user,
      created_at: new Date(user.created_at)
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const results = await db.select({
      id: usersTable.id,
      nama: usersTable.nama,
      email: usersTable.email,
      password: usersTable.password, // Include for schema compliance
      role: usersTable.role,
      kelas: usersTable.kelas,
      created_at: usersTable.created_at
    })
    .from(usersTable)
    .execute();

    return results.map(user => ({
      ...user,
      created_at: new Date(user.created_at)
    }));
  } catch (error) {
    console.error('Failed to fetch all users:', error);
    throw error;
  }
}

export async function getUsersByRole(role: 'admin' | 'peserta'): Promise<User[]> {
  try {
    const results = await db.select({
      id: usersTable.id,
      nama: usersTable.nama,
      email: usersTable.email,
      password: usersTable.password, // Include for schema compliance
      role: usersTable.role,
      kelas: usersTable.kelas,
      created_at: usersTable.created_at
    })
    .from(usersTable)
    .where(eq(usersTable.role, role))
    .execute();

    return results.map(user => ({
      ...user,
      created_at: new Date(user.created_at)
    }));
  } catch (error) {
    console.error('Failed to fetch users by role:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const results = await db.select({
      id: usersTable.id,
      nama: usersTable.nama,
      email: usersTable.email,
      password: usersTable.password, // Include for schema compliance
      role: usersTable.role,
      kelas: usersTable.kelas,
      created_at: usersTable.created_at
    })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .execute();

    if (results.length === 0) {
      return null;
    }

    const user = results[0];
    return {
      ...user,
      created_at: new Date(user.created_at)
    };
  } catch (error) {
    console.error('Failed to fetch user by ID:', error);
    throw error;
  }
}

export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    const updateData: any = {};

    if (input.nama !== undefined) {
      updateData.nama = input.nama;
    }

    if (input.email !== undefined) {
      updateData.email = input.email;
    }

    if (input.password !== undefined) {
      updateData.password = hashPassword(input.password);
    }

    if (input.kelas !== undefined) {
      updateData.kelas = input.kelas;
    }

    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('User not found');
    }

    const user = result[0];
    return {
      ...user,
      created_at: new Date(user.created_at)
    };
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}

export async function deleteUser(id: number): Promise<void> {
  try {
    const result = await db.delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('User not found');
    }
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
}

export async function resetUserPassword(input: ResetPasswordInput): Promise<User> {
  try {
    const hashedPassword = hashPassword(input.newPassword);

    const result = await db.update(usersTable)
      .set({ password: hashedPassword })
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('User not found');
    }

    const user = result[0];
    return {
      ...user,
      created_at: new Date(user.created_at)
    };
  } catch (error) {
    console.error('Password reset failed:', error);
    throw error;
  }
}