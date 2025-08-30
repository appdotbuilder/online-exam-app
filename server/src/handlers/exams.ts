import { db } from '../db';
import { examsTable, questionsTable, answersTable } from '../db/schema';
import { type CreateExamInput, type UpdateExamInput, type Exam } from '../schema';
import { eq, and, gte, lte, SQL } from 'drizzle-orm';

export async function createExam(input: CreateExamInput): Promise<Exam> {
  try {
    // Validate that tanggal_selesai is after tanggal_mulai
    if (input.tanggal_selesai <= input.tanggal_mulai) {
      throw new Error('Tanggal selesai harus setelah tanggal mulai');
    }

    // Insert exam record
    const result = await db.insert(examsTable)
      .values({
        judul_ujian: input.judul_ujian,
        deskripsi: input.deskripsi,
        tanggal_mulai: input.tanggal_mulai,
        tanggal_selesai: input.tanggal_selesai,
        durasi: input.durasi,
        status: input.status
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Exam creation failed:', error);
    throw error;
  }
}

export async function getAllExams(): Promise<Exam[]> {
  try {
    const result = await db.select()
      .from(examsTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Get all exams failed:', error);
    throw error;
  }
}

export async function getActiveExams(): Promise<Exam[]> {
  try {
    const now = new Date();
    
    const result = await db.select()
      .from(examsTable)
      .where(
        and(
          eq(examsTable.status, 'aktif'),
          lte(examsTable.tanggal_mulai, now),
          gte(examsTable.tanggal_selesai, now)
        )
      )
      .execute();

    return result;
  } catch (error) {
    console.error('Get active exams failed:', error);
    throw error;
  }
}

export async function getExamById(id: number): Promise<Exam | null> {
  try {
    const result = await db.select()
      .from(examsTable)
      .where(eq(examsTable.id, id))
      .limit(1)
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Get exam by ID failed:', error);
    throw error;
  }
}

export async function updateExam(input: UpdateExamInput): Promise<Exam> {
  try {
    // If both dates are provided, validate that tanggal_selesai is after tanggal_mulai
    if (input.tanggal_mulai && input.tanggal_selesai && input.tanggal_selesai <= input.tanggal_mulai) {
      throw new Error('Tanggal selesai harus setelah tanggal mulai');
    }

    // If only one date is provided, get the existing exam to validate
    if ((input.tanggal_mulai || input.tanggal_selesai) && !(input.tanggal_mulai && input.tanggal_selesai)) {
      const existingExam = await getExamById(input.id);
      if (!existingExam) {
        throw new Error('Exam not found');
      }

      const newStart = input.tanggal_mulai || existingExam.tanggal_mulai;
      const newEnd = input.tanggal_selesai || existingExam.tanggal_selesai;

      if (newEnd <= newStart) {
        throw new Error('Tanggal selesai harus setelah tanggal mulai');
      }
    }

    // Build update object with only defined fields
    const updateData: any = {};
    if (input.judul_ujian !== undefined) updateData.judul_ujian = input.judul_ujian;
    if (input.deskripsi !== undefined) updateData.deskripsi = input.deskripsi;
    if (input.tanggal_mulai !== undefined) updateData.tanggal_mulai = input.tanggal_mulai;
    if (input.tanggal_selesai !== undefined) updateData.tanggal_selesai = input.tanggal_selesai;
    if (input.durasi !== undefined) updateData.durasi = input.durasi;
    if (input.status !== undefined) updateData.status = input.status;

    const result = await db.update(examsTable)
      .set(updateData)
      .where(eq(examsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Exam not found');
    }

    return result[0];
  } catch (error) {
    console.error('Exam update failed:', error);
    throw error;
  }
}

export async function deleteExam(id: number): Promise<void> {
  try {
    // First, delete all answers related to this exam
    await db.delete(answersTable)
      .where(eq(answersTable.exam_id, id))
      .execute();

    // Then, delete all questions related to this exam
    await db.delete(questionsTable)
      .where(eq(questionsTable.exam_id, id))
      .execute();

    // Finally, delete the exam itself
    const result = await db.delete(examsTable)
      .where(eq(examsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Exam not found');
    }
  } catch (error) {
    console.error('Exam deletion failed:', error);
    throw error;
  }
}

export async function getExamsForParticipant(userId: number): Promise<Exam[]> {
  try {
    const now = new Date();
    
    // Get all active exams within the time period
    const result = await db.select()
      .from(examsTable)
      .where(
        and(
          eq(examsTable.status, 'aktif'),
          lte(examsTable.tanggal_mulai, now),
          gte(examsTable.tanggal_selesai, now)
        )
      )
      .execute();

    return result;
  } catch (error) {
    console.error('Get exams for participant failed:', error);
    throw error;
  }
}