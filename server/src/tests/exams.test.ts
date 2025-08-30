import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { examsTable, usersTable, questionsTable, answersTable } from '../db/schema';
import { type CreateExamInput, type UpdateExamInput } from '../schema';
import { 
  createExam, 
  getAllExams, 
  getActiveExams, 
  getExamById, 
  updateExam, 
  deleteExam, 
  getExamsForParticipant 
} from '../handlers/exams';
import { eq } from 'drizzle-orm';

// Test input data
const testExamInput: CreateExamInput = {
  judul_ujian: 'Test Exam',
  deskripsi: 'This is a test exam',
  tanggal_mulai: new Date('2024-01-15T09:00:00Z'),
  tanggal_selesai: new Date('2024-01-15T11:00:00Z'),
  durasi: 120,
  status: 'aktif'
};

const testExamInput2: CreateExamInput = {
  judul_ujian: 'Math Exam',
  deskripsi: 'Mathematics final exam',
  tanggal_mulai: new Date('2024-02-01T10:00:00Z'),
  tanggal_selesai: new Date('2024-02-01T12:00:00Z'),
  durasi: 90,
  status: 'non-aktif'
};

// Helper function to create a test user
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      nama: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'peserta',
      kelas: '12A'
    })
    .returning()
    .execute();
  return result[0];
};

describe('Exam Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createExam', () => {
    it('should create an exam successfully', async () => {
      const result = await createExam(testExamInput);

      expect(result.judul_ujian).toEqual('Test Exam');
      expect(result.deskripsi).toEqual(testExamInput.deskripsi);
      expect(result.tanggal_mulai).toEqual(testExamInput.tanggal_mulai);
      expect(result.tanggal_selesai).toEqual(testExamInput.tanggal_selesai);
      expect(result.durasi).toEqual(120);
      expect(result.status).toEqual('aktif');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save exam to database', async () => {
      const result = await createExam(testExamInput);

      const exams = await db.select()
        .from(examsTable)
        .where(eq(examsTable.id, result.id))
        .execute();

      expect(exams).toHaveLength(1);
      expect(exams[0].judul_ujian).toEqual('Test Exam');
      expect(exams[0].durasi).toEqual(120);
      expect(exams[0].status).toEqual('aktif');
    });

    it('should reject exam with end date before start date', async () => {
      const invalidInput: CreateExamInput = {
        ...testExamInput,
        tanggal_mulai: new Date('2024-01-15T11:00:00Z'),
        tanggal_selesai: new Date('2024-01-15T09:00:00Z')
      };

      await expect(createExam(invalidInput)).rejects.toThrow(/tanggal selesai harus setelah tanggal mulai/i);
    });

    it('should reject exam with same start and end date', async () => {
      const invalidInput: CreateExamInput = {
        ...testExamInput,
        tanggal_mulai: new Date('2024-01-15T10:00:00Z'),
        tanggal_selesai: new Date('2024-01-15T10:00:00Z')
      };

      await expect(createExam(invalidInput)).rejects.toThrow(/tanggal selesai harus setelah tanggal mulai/i);
    });
  });

  describe('getAllExams', () => {
    it('should return empty array when no exams exist', async () => {
      const result = await getAllExams();
      expect(result).toEqual([]);
    });

    it('should return all exams', async () => {
      await createExam(testExamInput);
      await createExam(testExamInput2);

      const result = await getAllExams();

      expect(result).toHaveLength(2);
      expect(result.some(e => e.judul_ujian === 'Test Exam')).toBe(true);
      expect(result.some(e => e.judul_ujian === 'Math Exam')).toBe(true);
    });

    it('should return exams with correct data types', async () => {
      await createExam(testExamInput);

      const result = await getAllExams();

      expect(result).toHaveLength(1);
      const exam = result[0];
      expect(typeof exam.id).toBe('number');
      expect(typeof exam.judul_ujian).toBe('string');
      expect(typeof exam.durasi).toBe('number');
      expect(exam.tanggal_mulai).toBeInstanceOf(Date);
      expect(exam.created_at).toBeInstanceOf(Date);
    });
  });

  describe('getActiveExams', () => {
    it('should return only active exams within time period', async () => {
      // Create active exam that's currently running
      const now = new Date();
      const activeExamInput: CreateExamInput = {
        ...testExamInput,
        tanggal_mulai: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
        tanggal_selesai: new Date(now.getTime() + 30 * 60 * 1000), // 30 minutes from now
        status: 'aktif'
      };

      // Create inactive exam
      const inactiveExamInput: CreateExamInput = {
        ...testExamInput2,
        tanggal_mulai: new Date(now.getTime() - 30 * 60 * 1000),
        tanggal_selesai: new Date(now.getTime() + 30 * 60 * 1000),
        status: 'non-aktif'
      };

      // Create expired exam
      const expiredExamInput: CreateExamInput = {
        ...testExamInput,
        judul_ujian: 'Expired Exam',
        tanggal_mulai: new Date(now.getTime() - 120 * 60 * 1000), // 2 hours ago
        tanggal_selesai: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
        status: 'aktif'
      };

      await createExam(activeExamInput);
      await createExam(inactiveExamInput);
      await createExam(expiredExamInput);

      const result = await getActiveExams();

      expect(result).toHaveLength(1);
      expect(result[0].status).toEqual('aktif');
    });

    it('should return empty array when no active exams', async () => {
      await createExam(testExamInput2); // non-aktif status

      const result = await getActiveExams();
      expect(result).toEqual([]);
    });
  });

  describe('getExamById', () => {
    it('should return exam when found', async () => {
      const created = await createExam(testExamInput);

      const result = await getExamById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.judul_ujian).toEqual('Test Exam');
    });

    it('should return null when exam not found', async () => {
      const result = await getExamById(999);
      expect(result).toBeNull();
    });
  });

  describe('updateExam', () => {
    it('should update exam successfully', async () => {
      const created = await createExam(testExamInput);

      const updateInput: UpdateExamInput = {
        id: created.id,
        judul_ujian: 'Updated Exam Title',
        durasi: 180
      };

      const result = await updateExam(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.judul_ujian).toEqual('Updated Exam Title');
      expect(result.durasi).toEqual(180);
      expect(result.deskripsi).toEqual(testExamInput.deskripsi); // Unchanged
    });

    it('should validate date constraints when updating both dates', async () => {
      const created = await createExam(testExamInput);

      const updateInput: UpdateExamInput = {
        id: created.id,
        tanggal_mulai: new Date('2024-01-15T11:00:00Z'),
        tanggal_selesai: new Date('2024-01-15T09:00:00Z')
      };

      await expect(updateExam(updateInput)).rejects.toThrow(/tanggal selesai harus setelah tanggal mulai/i);
    });

    it('should validate date constraints when updating only start date', async () => {
      const created = await createExam(testExamInput);

      const updateInput: UpdateExamInput = {
        id: created.id,
        tanggal_mulai: new Date('2024-01-15T12:00:00Z') // After original end date
      };

      await expect(updateExam(updateInput)).rejects.toThrow(/tanggal selesai harus setelah tanggal mulai/i);
    });

    it('should validate date constraints when updating only end date', async () => {
      const created = await createExam(testExamInput);

      const updateInput: UpdateExamInput = {
        id: created.id,
        tanggal_selesai: new Date('2024-01-15T08:00:00Z') // Before original start date
      };

      await expect(updateExam(updateInput)).rejects.toThrow(/tanggal selesai harus setelah tanggal mulai/i);
    });

    it('should throw error when exam not found', async () => {
      const updateInput: UpdateExamInput = {
        id: 999,
        judul_ujian: 'Updated Title'
      };

      await expect(updateExam(updateInput)).rejects.toThrow(/exam not found/i);
    });
  });

  describe('deleteExam', () => {
    it('should delete exam and related data successfully', async () => {
      const user = await createTestUser();
      const exam = await createExam(testExamInput);

      // Create related question
      await db.insert(questionsTable)
        .values({
          exam_id: exam.id,
          soal: 'Test question',
          pilihan: ['A', 'B', 'C', 'D'],
          jawaban_benar: 'A'
        })
        .execute();

      // Create related answer
      await db.insert(answersTable)
        .values({
          exam_id: exam.id,
          user_id: user.id,
          jawaban: { '1': 'A' },
          nilai: 0,
          waktu_submit: new Date(),
          is_submitted: false
        })
        .execute();

      await deleteExam(exam.id);

      // Verify exam is deleted
      const examResult = await db.select()
        .from(examsTable)
        .where(eq(examsTable.id, exam.id))
        .execute();
      expect(examResult).toHaveLength(0);

      // Verify questions are deleted
      const questionsResult = await db.select()
        .from(questionsTable)
        .where(eq(questionsTable.exam_id, exam.id))
        .execute();
      expect(questionsResult).toHaveLength(0);

      // Verify answers are deleted
      const answersResult = await db.select()
        .from(answersTable)
        .where(eq(answersTable.exam_id, exam.id))
        .execute();
      expect(answersResult).toHaveLength(0);
    });

    it('should throw error when exam not found', async () => {
      await expect(deleteExam(999)).rejects.toThrow(/exam not found/i);
    });
  });

  describe('getExamsForParticipant', () => {
    it('should return active exams within time period for participant', async () => {
      const user = await createTestUser();
      const now = new Date();

      // Create active exam that's currently running
      const activeExamInput: CreateExamInput = {
        ...testExamInput,
        tanggal_mulai: new Date(now.getTime() - 30 * 60 * 1000),
        tanggal_selesai: new Date(now.getTime() + 30 * 60 * 1000),
        status: 'aktif'
      };

      // Create inactive exam
      const inactiveExamInput: CreateExamInput = {
        ...testExamInput2,
        tanggal_mulai: new Date(now.getTime() - 30 * 60 * 1000),
        tanggal_selesai: new Date(now.getTime() + 30 * 60 * 1000),
        status: 'non-aktif'
      };

      await createExam(activeExamInput);
      await createExam(inactiveExamInput);

      const result = await getExamsForParticipant(user.id);

      expect(result).toHaveLength(1);
      expect(result[0].status).toEqual('aktif');
    });

    it('should return empty array when no active exams available', async () => {
      const user = await createTestUser();

      const result = await getExamsForParticipant(user.id);
      expect(result).toEqual([]);
    });
  });
});