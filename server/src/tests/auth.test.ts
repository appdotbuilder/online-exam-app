import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { hashPassword, verifyPassword, loginUser } from '../handlers/auth';

describe('auth handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testpassword123';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toEqual(password);
      expect(hashedPassword.includes(':')).toBe(true); // Should contain salt:hash format
      expect(hashedPassword.length).toBeGreaterThan(100); // Combined salt and hash should be long
    });

    it('should generate different hashes for same password', async () => {
      const password = 'samepassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toEqual(hash2); // Salt makes each hash unique
    });

    it('should produce consistent hash length', async () => {
      const password1 = 'short';
      const password2 = 'verylongpasswordwithmanycharacters';
      
      const hash1 = await hashPassword(password1);
      const hash2 = await hashPassword(password2);

      expect(hash1.length).toEqual(hash2.length); // PBKDF2 produces consistent length
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'correctpassword';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const correctPassword = 'correctpassword';
      const incorrectPassword = 'wrongpassword';
      const hashedPassword = await hashPassword(correctPassword);

      const isValid = await verifyPassword(incorrectPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should reject password against invalid hash format', async () => {
      const password = 'testpassword';
      const invalidHash = 'invalidhash';

      const isValid = await verifyPassword(password, invalidHash);
      expect(isValid).toBe(false);
    });

    it('should reject password against malformed hash', async () => {
      const password = 'testpassword';
      const malformedHash = 'salt:hash:extra';

      const isValid = await verifyPassword(password, malformedHash);
      expect(isValid).toBe(false);
    });
  });

  describe('loginUser', () => {
    const testUser = {
      nama: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'peserta' as const,
      kelas: '12A'
    };

    it('should login user with correct credentials', async () => {
      // Create test user with hashed password
      const hashedPassword = await hashPassword(testUser.password);
      await db.insert(usersTable)
        .values({
          ...testUser,
          password: hashedPassword
        })
        .execute();

      const loginInput: LoginInput = {
        email: testUser.email,
        password: testUser.password
      };

      const result = await loginUser(loginInput);

      expect(result).not.toBeNull();
      expect(result!.email).toEqual(testUser.email);
      expect(result!.nama).toEqual(testUser.nama);
      expect(result!.role).toEqual(testUser.role);
      expect(result!.kelas).toEqual(testUser.kelas);
      expect(result!.id).toBeDefined();
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(typeof result!.id).toBe('number');
    });

    it('should return null for non-existent user', async () => {
      const loginInput: LoginInput = {
        email: 'nonexistent@example.com',
        password: 'anypassword'
      };

      const result = await loginUser(loginInput);
      expect(result).toBeNull();
    });

    it('should return null for incorrect password', async () => {
      // Create test user
      const hashedPassword = await hashPassword(testUser.password);
      await db.insert(usersTable)
        .values({
          ...testUser,
          password: hashedPassword
        })
        .execute();

      const loginInput: LoginInput = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      const result = await loginUser(loginInput);
      expect(result).toBeNull();
    });

    it('should login admin user correctly', async () => {
      const adminUser = {
        nama: 'Admin User',
        email: 'admin@example.com',
        password: 'adminpass123',
        role: 'admin' as const,
        kelas: null // Admin doesn't have kelas
      };

      const hashedPassword = await hashPassword(adminUser.password);
      await db.insert(usersTable)
        .values({
          ...adminUser,
          password: hashedPassword
        })
        .execute();

      const loginInput: LoginInput = {
        email: adminUser.email,
        password: adminUser.password
      };

      const result = await loginUser(loginInput);

      expect(result).not.toBeNull();
      expect(result!.email).toEqual(adminUser.email);
      expect(result!.role).toEqual('admin');
      expect(result!.kelas).toBeNull();
    });

    it('should handle case-sensitive email correctly', async () => {
      // Create user with lowercase email
      const hashedPassword = await hashPassword(testUser.password);
      await db.insert(usersTable)
        .values({
          ...testUser,
          email: testUser.email.toLowerCase(),
          password: hashedPassword
        })
        .execute();

      // Try to login with different case
      const loginInput: LoginInput = {
        email: testUser.email.toUpperCase(),
        password: testUser.password
      };

      const result = await loginUser(loginInput);
      expect(result).toBeNull(); // Should fail due to case sensitivity
    });

    it('should handle user with corrupted password hash', async () => {
      // Create user with invalid hash format
      await db.insert(usersTable)
        .values({
          ...testUser,
          password: 'corruptedhash'
        })
        .execute();

      const loginInput: LoginInput = {
        email: testUser.email,
        password: testUser.password
      };

      const result = await loginUser(loginInput);
      expect(result).toBeNull(); // Should fail due to invalid hash
    });
  });
});