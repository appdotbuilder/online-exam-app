import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput, type ResetPasswordInput } from '../schema';
import {
  createUser,
  getAllUsers,
  getUsersByRole,
  getUserById,
  updateUser,
  deleteUser,
  resetUserPassword
} from '../handlers/users';
import { eq } from 'drizzle-orm';

// Test input data
const testAdminInput: CreateUserInput = {
  nama: 'Admin User',
  email: 'admin@test.com',
  password: 'password123',
  role: 'admin',
  kelas: null
};

const testPesertaInput: CreateUserInput = {
  nama: 'Peserta User',
  email: 'peserta@test.com',
  password: 'password123',
  role: 'peserta',
  kelas: 'XII IPA 1'
};

describe('User Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createUser', () => {
    it('should create an admin user', async () => {
      const result = await createUser(testAdminInput);

      expect(result.nama).toEqual('Admin User');
      expect(result.email).toEqual('admin@test.com');
      expect(result.password).not.toEqual('password123'); // Should be hashed
      expect(result.role).toEqual('admin');
      expect(result.kelas).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create a peserta user', async () => {
      const result = await createUser(testPesertaInput);

      expect(result.nama).toEqual('Peserta User');
      expect(result.email).toEqual('peserta@test.com');
      expect(result.password).not.toEqual('password123'); // Should be hashed
      expect(result.role).toEqual('peserta');
      expect(result.kelas).toEqual('XII IPA 1');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save user to database', async () => {
      const result = await createUser(testAdminInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].nama).toEqual('Admin User');
      expect(users[0].email).toEqual('admin@test.com');
      expect(users[0].role).toEqual('admin');
      expect(users[0].created_at).toBeInstanceOf(Date);
    });

    it('should handle duplicate email error', async () => {
      await createUser(testAdminInput);

      await expect(createUser(testAdminInput))
        .rejects.toThrow(/duplicate key value violates unique constraint|UNIQUE constraint failed/i);
    });
  });

  describe('getAllUsers', () => {
    it('should return empty array when no users exist', async () => {
      const result = await getAllUsers();
      expect(result).toEqual([]);
    });

    it('should return all users', async () => {
      await createUser(testAdminInput);
      await createUser(testPesertaInput);

      const result = await getAllUsers();

      expect(result).toHaveLength(2);
      expect(result.some(u => u.email === 'admin@test.com')).toBe(true);
      expect(result.some(u => u.email === 'peserta@test.com')).toBe(true);
      result.forEach(user => {
        expect(user.created_at).toBeInstanceOf(Date);
        expect(user.password).toBeDefined(); // Password included for schema compliance
      });
    });
  });

  describe('getUsersByRole', () => {
    beforeEach(async () => {
      await createUser(testAdminInput);
      await createUser(testPesertaInput);
      await createUser({
        ...testPesertaInput,
        email: 'peserta2@test.com',
        nama: 'Peserta User 2'
      });
    });

    it('should return admin users only', async () => {
      const result = await getUsersByRole('admin');

      expect(result).toHaveLength(1);
      expect(result[0].role).toEqual('admin');
      expect(result[0].email).toEqual('admin@test.com');
      expect(result[0].created_at).toBeInstanceOf(Date);
    });

    it('should return peserta users only', async () => {
      const result = await getUsersByRole('peserta');

      expect(result).toHaveLength(2);
      result.forEach(user => {
        expect(user.role).toEqual('peserta');
        expect(user.created_at).toBeInstanceOf(Date);
      });
    });

    it('should return empty array for role with no users', async () => {
      // Delete all users first
      await db.delete(usersTable).execute();

      const result = await getUsersByRole('admin');
      expect(result).toEqual([]);
    });
  });

  describe('getUserById', () => {
    it('should return null for non-existent user', async () => {
      const result = await getUserById(999);
      expect(result).toBeNull();
    });

    it('should return user by id', async () => {
      const createdUser = await createUser(testAdminInput);

      const result = await getUserById(createdUser.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdUser.id);
      expect(result!.nama).toEqual('Admin User');
      expect(result!.email).toEqual('admin@test.com');
      expect(result!.role).toEqual('admin');
      expect(result!.created_at).toBeInstanceOf(Date);
    });
  });

  describe('updateUser', () => {
    let userId: number;

    beforeEach(async () => {
      const user = await createUser(testPesertaInput);
      userId = user.id;
    });

    it('should update user name', async () => {
      const updateInput: UpdateUserInput = {
        id: userId,
        nama: 'Updated Name'
      };

      const result = await updateUser(updateInput);

      expect(result.nama).toEqual('Updated Name');
      expect(result.email).toEqual('peserta@test.com'); // Unchanged
      expect(result.role).toEqual('peserta'); // Unchanged
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should update user email', async () => {
      const updateInput: UpdateUserInput = {
        id: userId,
        email: 'newemail@test.com'
      };

      const result = await updateUser(updateInput);

      expect(result.email).toEqual('newemail@test.com');
      expect(result.nama).toEqual('Peserta User'); // Unchanged
    });

    it('should update user password', async () => {
      const originalUser = await getUserById(userId);
      const updateInput: UpdateUserInput = {
        id: userId,
        password: 'newpassword123'
      };

      const result = await updateUser(updateInput);

      expect(result.password).not.toEqual('newpassword123'); // Should be hashed
      expect(result.password).not.toEqual(originalUser!.password); // Should be different from original
    });

    it('should update user kelas', async () => {
      const updateInput: UpdateUserInput = {
        id: userId,
        kelas: 'XI IPS 2'
      };

      const result = await updateUser(updateInput);

      expect(result.kelas).toEqual('XI IPS 2');
    });

    it('should update multiple fields', async () => {
      const updateInput: UpdateUserInput = {
        id: userId,
        nama: 'New Name',
        email: 'new@test.com',
        kelas: 'X IPA 3'
      };

      const result = await updateUser(updateInput);

      expect(result.nama).toEqual('New Name');
      expect(result.email).toEqual('new@test.com');
      expect(result.kelas).toEqual('X IPA 3');
    });

    it('should throw error for non-existent user', async () => {
      const updateInput: UpdateUserInput = {
        id: 999,
        nama: 'Updated Name'
      };

      await expect(updateUser(updateInput))
        .rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should delete existing user', async () => {
      const user = await createUser(testAdminInput);

      await deleteUser(user.id);

      const result = await getUserById(user.id);
      expect(result).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      await expect(deleteUser(999))
        .rejects.toThrow('User not found');
    });

    it('should remove user from database', async () => {
      const user = await createUser(testAdminInput);

      await deleteUser(user.id);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      expect(users).toHaveLength(0);
    });
  });

  describe('resetUserPassword', () => {
    let userId: number;
    let originalPassword: string;

    beforeEach(async () => {
      const user = await createUser(testAdminInput);
      userId = user.id;
      originalPassword = user.password;
    });

    it('should reset user password', async () => {
      const resetInput: ResetPasswordInput = {
        id: userId,
        newPassword: 'resetpassword123'
      };

      const result = await resetUserPassword(resetInput);

      expect(result.password).not.toEqual('resetpassword123'); // Should be hashed
      expect(result.password).not.toEqual(originalPassword); // Should be different from original
      expect(result.id).toEqual(userId);
      expect(result.nama).toEqual('Admin User'); // Other fields unchanged
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save new password to database', async () => {
      const resetInput: ResetPasswordInput = {
        id: userId,
        newPassword: 'resetpassword123'
      };

      await resetUserPassword(resetInput);

      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      expect(user[0].password).not.toEqual(originalPassword);
      expect(user[0].password).not.toEqual('resetpassword123'); // Should be hashed
    });

    it('should throw error for non-existent user', async () => {
      const resetInput: ResetPasswordInput = {
        id: 999,
        newPassword: 'resetpassword123'
      };

      await expect(resetUserPassword(resetInput))
        .rejects.toThrow('User not found');
    });
  });
});