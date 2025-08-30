import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, examsTable, questionsTable, answersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { 
    createAnswer,
    getUserAnswer,
    updateProgress,
    submitExam,
    calculateScore,
    getAnswersByExamId
} from '../handlers/answers';
import { 
    type CreateAnswerInput, 
    type UpdateProgressInput, 
    type SubmitExamInput,
    type GetUserAnswerInput
} from '../schema';

// Test data
const testUser = {
    nama: 'Test Student',
    email: 'student@test.com',
    password: 'password123',
    role: 'peserta' as const,
    kelas: '12A'
};

const testExam = {
    judul_ujian: 'Test Exam',
    deskripsi: 'A test exam',
    tanggal_mulai: new Date(),
    tanggal_selesai: new Date(Date.now() + 3600000), // 1 hour later
    durasi: 60,
    status: 'aktif' as const
};

const testQuestions = [
    {
        soal: 'What is 2 + 2?',
        pilihan: ['2', '3', '4', '5'],
        jawaban_benar: 'C'
    },
    {
        soal: 'What is the capital of France?',
        pilihan: ['London', 'Berlin', 'Paris', 'Rome'],
        jawaban_benar: 'C'
    }
];

describe('Answer Handlers', () => {
    let userId: number;
    let examId: number;
    let questionIds: number[];

    beforeEach(async () => {
        await createDB();
        
        // Create test user
        const userResult = await db.insert(usersTable)
            .values(testUser)
            .returning()
            .execute();
        userId = userResult[0].id;

        // Create test exam
        const examResult = await db.insert(examsTable)
            .values(testExam)
            .returning()
            .execute();
        examId = examResult[0].id;

        // Create test questions
        const questionPromises = testQuestions.map(question => 
            db.insert(questionsTable)
                .values({
                    exam_id: examId,
                    ...question
                })
                .returning()
                .execute()
        );
        
        const questionResults = await Promise.all(questionPromises);
        questionIds = questionResults.map(result => result[0].id);
    });

    afterEach(resetDB);

    describe('createAnswer', () => {
        it('should create an answer record', async () => {
            const input: CreateAnswerInput = {
                exam_id: examId,
                user_id: userId,
                jawaban: {},
                is_submitted: false
            };

            const result = await createAnswer(input);

            expect(result.id).toBeDefined();
            expect(result.exam_id).toBe(examId);
            expect(result.user_id).toBe(userId);
            expect(result.jawaban).toEqual({});
            expect(result.nilai).toBe(0);
            expect(result.is_submitted).toBe(false);
            expect(result.progress_jawaban).toBeNull();
            expect(result.created_at).toBeInstanceOf(Date);
            expect(result.waktu_submit).toBeInstanceOf(Date);
        });

        it('should create answer with progress data', async () => {
            const progressData = { [questionIds[0].toString()]: 'A' };
            const input: CreateAnswerInput = {
                exam_id: examId,
                user_id: userId,
                jawaban: {},
                is_submitted: false,
                progress_jawaban: progressData
            };

            const result = await createAnswer(input);

            expect(result.progress_jawaban).toEqual(progressData);
        });

        it('should prevent duplicate answer records', async () => {
            const input: CreateAnswerInput = {
                exam_id: examId,
                user_id: userId,
                jawaban: {},
                is_submitted: false
            };

            // Create first answer
            await createAnswer(input);

            // Try to create duplicate
            await expect(createAnswer(input))
                .rejects.toThrow(/Answer record already exists/i);
        });

        it('should throw error for non-existent user', async () => {
            const input: CreateAnswerInput = {
                exam_id: examId,
                user_id: 99999, // Non-existent user
                jawaban: {},
                is_submitted: false
            };

            await expect(createAnswer(input))
                .rejects.toThrow(/User not found/i);
        });

        it('should throw error for non-existent exam', async () => {
            const input: CreateAnswerInput = {
                exam_id: 99999, // Non-existent exam
                user_id: userId,
                jawaban: {},
                is_submitted: false
            };

            await expect(createAnswer(input))
                .rejects.toThrow(/Exam not found/i);
        });
    });

    describe('getUserAnswer', () => {
        it('should return answer if exists', async () => {
            // Create answer first
            const createInput: CreateAnswerInput = {
                exam_id: examId,
                user_id: userId,
                jawaban: {},
                is_submitted: false
            };
            
            const createdAnswer = await createAnswer(createInput);

            // Get answer
            const input: GetUserAnswerInput = {
                examId: examId,
                userId: userId
            };

            const result = await getUserAnswer(input);

            expect(result).not.toBeNull();
            expect(result!.id).toBe(createdAnswer.id);
            expect(result!.exam_id).toBe(examId);
            expect(result!.user_id).toBe(userId);
        });

        it('should return null if answer does not exist', async () => {
            const input: GetUserAnswerInput = {
                examId: examId,
                userId: userId
            };

            const result = await getUserAnswer(input);

            expect(result).toBeNull();
        });
    });

    describe('updateProgress', () => {
        let answerId: number;

        beforeEach(async () => {
            const createInput: CreateAnswerInput = {
                exam_id: examId,
                user_id: userId,
                jawaban: {},
                is_submitted: false
            };
            
            const answer = await createAnswer(createInput);
            answerId = answer.id;
        });

        it('should update progress data', async () => {
            const progressData = { 
                [questionIds[0].toString()]: 'A',
                [questionIds[1].toString()]: 'B'
            };

            const input: UpdateProgressInput = {
                id: answerId,
                progress_jawaban: progressData
            };

            const result = await updateProgress(input);

            expect(result.progress_jawaban).toEqual(progressData);
            expect(result.is_submitted).toBe(false);
        });

        it('should throw error for non-existent answer', async () => {
            const input: UpdateProgressInput = {
                id: 99999, // Non-existent answer
                progress_jawaban: {}
            };

            await expect(updateProgress(input))
                .rejects.toThrow(/Answer record not found/i);
        });

        it('should prevent updating submitted exam progress', async () => {
            // Submit exam first
            const submitInput: SubmitExamInput = {
                id: answerId,
                jawaban: {}
            };
            await submitExam(submitInput);

            // Try to update progress
            const input: UpdateProgressInput = {
                id: answerId,
                progress_jawaban: { '1': 'A' }
            };

            await expect(updateProgress(input))
                .rejects.toThrow(/Cannot update progress for submitted exam/i);
        });
    });

    describe('submitExam', () => {
        let answerId: number;

        beforeEach(async () => {
            const createInput: CreateAnswerInput = {
                exam_id: examId,
                user_id: userId,
                jawaban: {},
                is_submitted: false
            };
            
            const answer = await createAnswer(createInput);
            answerId = answer.id;
        });

        it('should submit exam with correct score calculation', async () => {
            const userAnswers = {
                [questionIds[0].toString()]: 'C', // Correct answer
                [questionIds[1].toString()]: 'C'  // Correct answer
            };

            const input: SubmitExamInput = {
                id: answerId,
                jawaban: userAnswers
            };

            const result = await submitExam(input);

            expect(result.jawaban).toEqual(userAnswers);
            expect(result.nilai).toBe(100); // 2/2 correct = 100%
            expect(result.is_submitted).toBe(true);
            expect(result.waktu_submit).toBeInstanceOf(Date);
        });

        it('should calculate partial score correctly', async () => {
            const userAnswers = {
                [questionIds[0].toString()]: 'C', // Correct answer
                [questionIds[1].toString()]: 'A'  // Wrong answer
            };

            const input: SubmitExamInput = {
                id: answerId,
                jawaban: userAnswers
            };

            const result = await submitExam(input);

            expect(result.nilai).toBe(50); // 1/2 correct = 50%
        });

        it('should throw error for non-existent answer', async () => {
            const input: SubmitExamInput = {
                id: 99999, // Non-existent answer
                jawaban: {}
            };

            await expect(submitExam(input))
                .rejects.toThrow(/Answer record not found/i);
        });

        it('should prevent duplicate submission', async () => {
            const input: SubmitExamInput = {
                id: answerId,
                jawaban: {}
            };

            // Submit first time
            await submitExam(input);

            // Try to submit again
            await expect(submitExam(input))
                .rejects.toThrow(/Exam has already been submitted/i);
        });
    });

    describe('calculateScore', () => {
        it('should calculate perfect score', async () => {
            const userAnswers = {
                [questionIds[0].toString()]: 'C',
                [questionIds[1].toString()]: 'C'
            };

            const score = await calculateScore(examId, userAnswers);

            expect(score).toBe(100);
        });

        it('should calculate partial score', async () => {
            const userAnswers = {
                [questionIds[0].toString()]: 'C', // Correct
                [questionIds[1].toString()]: 'A'  // Wrong
            };

            const score = await calculateScore(examId, userAnswers);

            expect(score).toBe(50);
        });

        it('should handle missing answers', async () => {
            const userAnswers = {
                [questionIds[0].toString()]: 'C' // Only one answer provided
            };

            const score = await calculateScore(examId, userAnswers);

            expect(score).toBe(50); // 1/2 correct = 50%
        });

        it('should return 0 for exam with no questions', async () => {
            // Create exam without questions
            const emptyExam = await db.insert(examsTable)
                .values({
                    ...testExam,
                    judul_ujian: 'Empty Exam'
                })
                .returning()
                .execute();

            const score = await calculateScore(emptyExam[0].id, {});

            expect(score).toBe(0);
        });
    });

    describe('getAnswersByExamId', () => {
        it('should return all answers for an exam', async () => {
            // Create multiple users and answers
            const user2 = await db.insert(usersTable)
                .values({
                    ...testUser,
                    email: 'student2@test.com',
                    nama: 'Test Student 2'
                })
                .returning()
                .execute();

            // Create answers for both users
            await createAnswer({
                exam_id: examId,
                user_id: userId,
                jawaban: {},
                is_submitted: false
            });

            await createAnswer({
                exam_id: examId,
                user_id: user2[0].id,
                jawaban: {},
                is_submitted: false
            });

            const results = await getAnswersByExamId(examId);

            expect(results).toHaveLength(2);
            expect(results.map(r => r.user_id).sort()).toEqual([userId, user2[0].id].sort());
        });

        it('should return empty array for exam with no answers', async () => {
            const results = await getAnswersByExamId(examId);

            expect(results).toHaveLength(0);
        });

        it('should throw error for non-existent exam', async () => {
            await expect(getAnswersByExamId(99999))
                .rejects.toThrow(/Exam not found/i);
        });
    });
});