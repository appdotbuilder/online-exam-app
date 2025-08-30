import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, examsTable, questionsTable, answersTable } from '../db/schema';
import { type CreateQuestionInput, type UpdateQuestionInput, type GetQuestionsByExamInput } from '../schema';
import { 
  createQuestion, 
  getQuestionsByExamId, 
  getQuestionById, 
  updateQuestion, 
  deleteQuestion,
  getQuestionsForParticipant 
} from '../handlers/questions';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  nama: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  role: 'peserta' as const,
  kelas: '12A'
};

const testExam = {
  judul_ujian: 'Test Exam',
  deskripsi: 'Test exam description',
  tanggal_mulai: new Date('2024-01-01'),
  tanggal_selesai: new Date('2024-01-02'),
  durasi: 120,
  status: 'aktif' as const
};

const testQuestion: CreateQuestionInput = {
  exam_id: 1,
  soal: 'What is 2 + 2?',
  pilihan: ['1', '2', '3', '4'],
  jawaban_benar: 'D'
};

describe('Questions Handler', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createQuestion', () => {
    it('should create a question successfully', async () => {
      // Create prerequisite exam
      const examResult = await db.insert(examsTable)
        .values(testExam)
        .returning()
        .execute();

      const question = await createQuestion({
        ...testQuestion,
        exam_id: examResult[0].id
      });

      expect(question.id).toBeDefined();
      expect(question.exam_id).toEqual(examResult[0].id);
      expect(question.soal).toEqual('What is 2 + 2?');
      expect(question.pilihan).toEqual(['1', '2', '3', '4']);
      expect(question.jawaban_benar).toEqual('D');
      expect(question.created_at).toBeInstanceOf(Date);
    });

    it('should save question to database', async () => {
      // Create prerequisite exam
      const examResult = await db.insert(examsTable)
        .values(testExam)
        .returning()
        .execute();

      const question = await createQuestion({
        ...testQuestion,
        exam_id: examResult[0].id
      });

      const savedQuestion = await db.select()
        .from(questionsTable)
        .where(eq(questionsTable.id, question.id))
        .execute();

      expect(savedQuestion).toHaveLength(1);
      expect(savedQuestion[0].soal).toEqual('What is 2 + 2?');
      expect(savedQuestion[0].pilihan).toEqual(['1', '2', '3', '4']);
      expect(savedQuestion[0].jawaban_benar).toEqual('D');
    });

    it('should throw error when exam does not exist', async () => {
      await expect(createQuestion({
        ...testQuestion,
        exam_id: 999 // Non-existent exam
      })).rejects.toThrow(/exam with id 999 does not exist/i);
    });

    it('should handle multiple choice options correctly', async () => {
      // Create prerequisite exam
      const examResult = await db.insert(examsTable)
        .values(testExam)
        .returning()
        .execute();

      const questionWithChoices = {
        ...testQuestion,
        exam_id: examResult[0].id,
        pilihan: ['True', 'False', 'Maybe', 'Never'],
        jawaban_benar: 'A' as const
      };

      const question = await createQuestion(questionWithChoices);

      expect(question.pilihan).toEqual(['True', 'False', 'Maybe', 'Never']);
      expect(question.jawaban_benar).toEqual('A');
    });
  });

  describe('getQuestionsByExamId', () => {
    it('should return all questions for an exam', async () => {
      // Create prerequisite exam
      const examResult = await db.insert(examsTable)
        .values(testExam)
        .returning()
        .execute();

      // Create multiple questions
      await createQuestion({
        ...testQuestion,
        exam_id: examResult[0].id,
        soal: 'Question 1'
      });

      await createQuestion({
        ...testQuestion,
        exam_id: examResult[0].id,
        soal: 'Question 2',
        jawaban_benar: 'B'
      });

      const questions = await getQuestionsByExamId({ examId: examResult[0].id });

      expect(questions).toHaveLength(2);
      expect(questions[0].soal).toEqual('Question 1');
      expect(questions[1].soal).toEqual('Question 2');
      expect(questions[0].pilihan).toEqual(['1', '2', '3', '4']);
      expect(questions[1].jawaban_benar).toEqual('B');
    });

    it('should return empty array when no questions exist', async () => {
      // Create prerequisite exam
      const examResult = await db.insert(examsTable)
        .values(testExam)
        .returning()
        .execute();

      const questions = await getQuestionsByExamId({ examId: examResult[0].id });

      expect(questions).toHaveLength(0);
    });

    it('should return empty array for non-existent exam', async () => {
      const questions = await getQuestionsByExamId({ examId: 999 });

      expect(questions).toHaveLength(0);
    });
  });

  describe('getQuestionById', () => {
    it('should return question by ID', async () => {
      // Create prerequisite exam
      const examResult = await db.insert(examsTable)
        .values(testExam)
        .returning()
        .execute();

      const createdQuestion = await createQuestion({
        ...testQuestion,
        exam_id: examResult[0].id
      });

      const question = await getQuestionById(createdQuestion.id);

      expect(question).not.toBeNull();
      expect(question!.id).toEqual(createdQuestion.id);
      expect(question!.soal).toEqual('What is 2 + 2?');
      expect(question!.pilihan).toEqual(['1', '2', '3', '4']);
      expect(question!.jawaban_benar).toEqual('D');
    });

    it('should return null for non-existent question', async () => {
      const question = await getQuestionById(999);

      expect(question).toBeNull();
    });
  });

  describe('updateQuestion', () => {
    it('should update question successfully', async () => {
      // Create prerequisite exam
      const examResult = await db.insert(examsTable)
        .values(testExam)
        .returning()
        .execute();

      const createdQuestion = await createQuestion({
        ...testQuestion,
        exam_id: examResult[0].id
      });

      const updateInput: UpdateQuestionInput = {
        id: createdQuestion.id,
        soal: 'What is 3 + 3?',
        pilihan: ['4', '5', '6', '7'],
        jawaban_benar: 'C'
      };

      const updatedQuestion = await updateQuestion(updateInput);

      expect(updatedQuestion.id).toEqual(createdQuestion.id);
      expect(updatedQuestion.soal).toEqual('What is 3 + 3?');
      expect(updatedQuestion.pilihan).toEqual(['4', '5', '6', '7']);
      expect(updatedQuestion.jawaban_benar).toEqual('C');
    });

    it('should update only provided fields', async () => {
      // Create prerequisite exam
      const examResult = await db.insert(examsTable)
        .values(testExam)
        .returning()
        .execute();

      const createdQuestion = await createQuestion({
        ...testQuestion,
        exam_id: examResult[0].id
      });

      const updateInput: UpdateQuestionInput = {
        id: createdQuestion.id,
        soal: 'Updated question only'
      };

      const updatedQuestion = await updateQuestion(updateInput);

      expect(updatedQuestion.soal).toEqual('Updated question only');
      expect(updatedQuestion.pilihan).toEqual(['1', '2', '3', '4']); // Should remain unchanged
      expect(updatedQuestion.jawaban_benar).toEqual('D'); // Should remain unchanged
    });

    it('should throw error when question does not exist', async () => {
      const updateInput: UpdateQuestionInput = {
        id: 999,
        soal: 'This should fail'
      };

      await expect(updateQuestion(updateInput)).rejects.toThrow(/question with id 999 does not exist/i);
    });
  });

  describe('deleteQuestion', () => {
    it('should delete question successfully', async () => {
      // Create prerequisite exam
      const examResult = await db.insert(examsTable)
        .values(testExam)
        .returning()
        .execute();

      const createdQuestion = await createQuestion({
        ...testQuestion,
        exam_id: examResult[0].id
      });

      await deleteQuestion(createdQuestion.id);

      const question = await getQuestionById(createdQuestion.id);
      expect(question).toBeNull();
    });

    it('should clean up related answer data', async () => {
      // Create prerequisite data
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const examResult = await db.insert(examsTable)
        .values(testExam)
        .returning()
        .execute();

      const createdQuestion = await createQuestion({
        ...testQuestion,
        exam_id: examResult[0].id
      });

      // Create an answer that references this question
      await db.insert(answersTable)
        .values({
          exam_id: examResult[0].id,
          user_id: userResult[0].id,
          jawaban: { [createdQuestion.id.toString()]: 'D' },
          nilai: 100,
          waktu_submit: new Date(),
          is_submitted: true,
          progress_jawaban: { [createdQuestion.id.toString()]: 'D' }
        })
        .execute();

      await deleteQuestion(createdQuestion.id);

      // Check that answer data was cleaned up
      const answers = await db.select()
        .from(answersTable)
        .where(eq(answersTable.exam_id, examResult[0].id))
        .execute();

      expect(answers).toHaveLength(1);
      const jawaban = answers[0].jawaban as Record<string, string>;
      const progressJawaban = answers[0].progress_jawaban as Record<string, string>;
      
      expect(jawaban[createdQuestion.id.toString()]).toBeUndefined();
      expect(progressJawaban[createdQuestion.id.toString()]).toBeUndefined();
    });

    it('should throw error when question does not exist', async () => {
      await expect(deleteQuestion(999)).rejects.toThrow(/question with id 999 does not exist/i);
    });
  });

  describe('getQuestionsForParticipant', () => {
    it('should return questions without correct answers', async () => {
      // Create prerequisite exam
      const examResult = await db.insert(examsTable)
        .values(testExam)
        .returning()
        .execute();

      await createQuestion({
        ...testQuestion,
        exam_id: examResult[0].id
      });

      const questions = await getQuestionsForParticipant(examResult[0].id);

      expect(questions).toHaveLength(1);
      expect(questions[0].soal).toEqual('What is 2 + 2?');
      expect(questions[0].pilihan).toEqual(['1', '2', '3', '4']);
      expect(questions[0]).not.toHaveProperty('jawaban_benar');
    });

    it('should return empty array when no questions exist', async () => {
      // Create prerequisite exam
      const examResult = await db.insert(examsTable)
        .values(testExam)
        .returning()
        .execute();

      const questions = await getQuestionsForParticipant(examResult[0].id);

      expect(questions).toHaveLength(0);
    });

    it('should include all required fields except jawaban_benar', async () => {
      // Create prerequisite exam
      const examResult = await db.insert(examsTable)
        .values(testExam)
        .returning()
        .execute();

      const createdQuestion = await createQuestion({
        ...testQuestion,
        exam_id: examResult[0].id
      });

      const questions = await getQuestionsForParticipant(examResult[0].id);

      expect(questions[0]).toHaveProperty('id');
      expect(questions[0]).toHaveProperty('exam_id');
      expect(questions[0]).toHaveProperty('soal');
      expect(questions[0]).toHaveProperty('pilihan');
      expect(questions[0]).toHaveProperty('created_at');
      expect(questions[0]).not.toHaveProperty('jawaban_benar');

      expect(questions[0].id).toEqual(createdQuestion.id);
      expect(questions[0].exam_id).toEqual(examResult[0].id);
      expect(questions[0].created_at).toBeInstanceOf(Date);
    });
  });
});