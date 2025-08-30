import { db } from '../db';
import { answersTable, questionsTable, usersTable, examsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { 
    type CreateAnswerInput, 
    type UpdateProgressInput, 
    type SubmitExamInput, 
    type Answer, 
    type GetUserAnswerInput 
} from '../schema';

export async function createAnswer(input: CreateAnswerInput): Promise<Answer> {
    try {
        // Check if answer already exists for this user and exam
        const existingAnswer = await db.select()
            .from(answersTable)
            .where(and(
                eq(answersTable.user_id, input.user_id),
                eq(answersTable.exam_id, input.exam_id)
            ))
            .execute();

        if (existingAnswer.length > 0) {
            throw new Error('Answer record already exists for this user and exam');
        }

        // Verify user and exam exist
        const user = await db.select()
            .from(usersTable)
            .where(eq(usersTable.id, input.user_id))
            .execute();

        if (user.length === 0) {
            throw new Error('User not found');
        }

        const exam = await db.select()
            .from(examsTable)
            .where(eq(examsTable.id, input.exam_id))
            .execute();

        if (exam.length === 0) {
            throw new Error('Exam not found');
        }

        // Create answer record
        const result = await db.insert(answersTable)
            .values({
                exam_id: input.exam_id,
                user_id: input.user_id,
                jawaban: input.jawaban,
                nilai: 0, // Will be calculated on submit
                waktu_submit: new Date(), // Default timestamp
                is_submitted: input.is_submitted || false,
                progress_jawaban: input.progress_jawaban || null
            })
            .returning()
            .execute();

        const answer = result[0];
        return {
            ...answer,
            jawaban: answer.jawaban as Record<string, string>,
            progress_jawaban: answer.progress_jawaban as Record<string, string> | null
        };
    } catch (error) {
        console.error('Answer creation failed:', error);
        throw error;
    }
}

export async function getUserAnswer(input: GetUserAnswerInput): Promise<Answer | null> {
    try {
        const results = await db.select()
            .from(answersTable)
            .where(and(
                eq(answersTable.user_id, input.userId),
                eq(answersTable.exam_id, input.examId)
            ))
            .execute();

        if (results.length === 0) {
            return null;
        }

        const answer = results[0];
        return {
            ...answer,
            jawaban: answer.jawaban as Record<string, string>,
            progress_jawaban: answer.progress_jawaban as Record<string, string> | null
        };
    } catch (error) {
        console.error('Get user answer failed:', error);
        throw error;
    }
}

export async function updateProgress(input: UpdateProgressInput): Promise<Answer> {
    try {
        // Verify answer exists
        const existingAnswer = await db.select()
            .from(answersTable)
            .where(eq(answersTable.id, input.id))
            .execute();

        if (existingAnswer.length === 0) {
            throw new Error('Answer record not found');
        }

        if (existingAnswer[0].is_submitted) {
            throw new Error('Cannot update progress for submitted exam');
        }

        // Update progress
        const result = await db.update(answersTable)
            .set({
                progress_jawaban: input.progress_jawaban
            })
            .where(eq(answersTable.id, input.id))
            .returning()
            .execute();

        const answer = result[0];
        return {
            ...answer,
            jawaban: answer.jawaban as Record<string, string>,
            progress_jawaban: answer.progress_jawaban as Record<string, string> | null
        };
    } catch (error) {
        console.error('Update progress failed:', error);
        throw error;
    }
}

export async function submitExam(input: SubmitExamInput): Promise<Answer> {
    try {
        // Verify answer exists
        const existingAnswer = await db.select()
            .from(answersTable)
            .where(eq(answersTable.id, input.id))
            .execute();

        if (existingAnswer.length === 0) {
            throw new Error('Answer record not found');
        }

        if (existingAnswer[0].is_submitted) {
            throw new Error('Exam has already been submitted');
        }

        // Calculate score
        const score = await calculateScore(existingAnswer[0].exam_id, input.jawaban);

        // Update answer with final submission
        const result = await db.update(answersTable)
            .set({
                jawaban: input.jawaban,
                nilai: score,
                is_submitted: true,
                waktu_submit: new Date()
            })
            .where(eq(answersTable.id, input.id))
            .returning()
            .execute();

        const answer = result[0];
        return {
            ...answer,
            jawaban: answer.jawaban as Record<string, string>,
            progress_jawaban: answer.progress_jawaban as Record<string, string> | null
        };
    } catch (error) {
        console.error('Submit exam failed:', error);
        throw error;
    }
}

export async function calculateScore(examId: number, userAnswers: Record<string, string>): Promise<number> {
    try {
        // Get all questions for the exam
        const questions = await db.select()
            .from(questionsTable)
            .where(eq(questionsTable.exam_id, examId))
            .execute();

        if (questions.length === 0) {
            return 0;
        }

        let correctAnswers = 0;
        
        // Compare user answers with correct answers
        for (const question of questions) {
            const userAnswer = userAnswers[question.id.toString()];
            if (userAnswer && userAnswer === question.jawaban_benar) {
                correctAnswers++;
            }
        }

        // Calculate percentage score
        const score = Math.round((correctAnswers / questions.length) * 100);
        return score;
    } catch (error) {
        console.error('Calculate score failed:', error);
        throw error;
    }
}

export async function getAnswersByExamId(examId: number): Promise<Answer[]> {
    try {
        // Verify exam exists
        const exam = await db.select()
            .from(examsTable)
            .where(eq(examsTable.id, examId))
            .execute();

        if (exam.length === 0) {
            throw new Error('Exam not found');
        }

        // Get all answers for the exam
        const results = await db.select()
            .from(answersTable)
            .where(eq(answersTable.exam_id, examId))
            .execute();

        return results.map(answer => ({
            ...answer,
            jawaban: answer.jawaban as Record<string, string>,
            progress_jawaban: answer.progress_jawaban as Record<string, string> | null
        }));
    } catch (error) {
        console.error('Get answers by exam ID failed:', error);
        throw error;
    }
}