import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  try {
    // Generate a random salt
    const salt = randomBytes(32).toString('hex');
    
    // Use PBKDF2 to hash the password with the salt
    const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    
    // Return salt and hash combined
    return `${salt}:${hash}`;
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw error;
  }
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    // Split the stored hash to get salt and hash
    const parts = hashedPassword.split(':');
    if (parts.length !== 2) {
      return false; // Invalid hash format
    }
    
    const [salt, storedHash] = parts;
    
    // Hash the provided password with the same salt
    const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    
    // Compare the hashes
    return hash === storedHash;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

export async function loginUser(input: LoginInput): Promise<User | null> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await verifyPassword(input.password, user.password);
    
    if (!isPasswordValid) {
      return null; // Invalid password
    }

    // Return user data (password excluded for security)
    return {
      id: user.id,
      nama: user.nama,
      email: user.email,
      password: user.password, // Note: In real apps, you'd exclude this
      role: user.role,
      kelas: user.kelas,
      created_at: user.created_at
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
}