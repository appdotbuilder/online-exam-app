import { db } from '../db';
import { questionsTable, examsTable, answersTable } from '../db/schema';
import { type CreateQuestionInput, type UpdateQuestionInput, type Question, type GetQuestionsByExamInput } from '../schema';
import { eq, SQL, and } from 'drizzle-orm';

export async function createQuestion(input: CreateQuestionInput): Promise<Question> {
  try {
    // First, validate that the exam exists
    const examExists = await db.select()
      .from(examsTable)
      .where(eq(examsTable.id, input.exam_id))
      .execute();

    if (examExists.length === 0) {
      throw new Error(`Exam with ID ${input.exam_id} does not exist`);
    }

    // Insert the question
    const result = await db.insert(questionsTable)
      .values({
        exam_id: input.exam_id,
        soal: input.soal,
        pilihan: input.pilihan,
        jawaban_benar: input.jawaban_benar
      })
      .returning()
      .execute();

    const question = result[0];
    return {
      ...question,
      pilihan: question.pilihan as string[] // Cast JSON back to string array
    };
  } catch (error) {
    console.error('Question creation failed:', error);
    throw error;
  }
}

export async function getQuestionsByExamId(input: GetQuestionsByExamInput): Promise<Question[]> {
  try {
    const results = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.exam_id, input.examId))
      .execute();

    return results.map(question => ({
      ...question,
      pilihan: question.pilihan as string[] // Cast JSON back to string array
    }));
  } catch (error) {
    console.error('Failed to get questions by exam ID:', error);
    throw error;
  }
}

export async function getQuestionById(id: number): Promise<Question | null> {
  try {
    const results = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const question = results[0];
    return {
      ...question,
      pilihan: question.pilihan as string[] // Cast JSON back to string array
    };
  } catch (error) {
    console.error('Failed to get question by ID:', error);
    throw error;
  }
}

export async function updateQuestion(input: UpdateQuestionInput): Promise<Question> {
  try {
    // First check if question exists
    const existingQuestion = await getQuestionById(input.id);
    if (!existingQuestion) {
      throw new Error(`Question with ID ${input.id} does not exist`);
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (input.soal !== undefined) updateData.soal = input.soal;
    if (input.pilihan !== undefined) updateData.pilihan = input.pilihan;
    if (input.jawaban_benar !== undefined) updateData.jawaban_benar = input.jawaban_benar;

    const result = await db.update(questionsTable)
      .set(updateData)
      .where(eq(questionsTable.id, input.id))
      .returning()
      .execute();

    const question = result[0];
    return {
      ...question,
      pilihan: question.pilihan as string[] // Cast JSON back to string array
    };
  } catch (error) {
    console.error('Question update failed:', error);
    throw error;
  }
}

export async function deleteQuestion(id: number): Promise<void> {
  try {
    // First check if question exists
    const existingQuestion = await getQuestionById(id);
    if (!existingQuestion) {
      throw new Error(`Question with ID ${id} does not exist`);
    }

    // Clean up related answer data that references this question
    // This involves updating the JSON fields in answers table
    const answers = await db.select()
      .from(answersTable)
      .where(eq(answersTable.exam_id, existingQuestion.exam_id))
      .execute();

    // Update each answer to remove references to this question
    for (const answer of answers) {
      const jawaban = answer.jawaban as Record<string, string>;
      const progressJawaban = answer.progress_jawaban as Record<string, string> | null;

      // Remove the question from jawaban object
      if (jawaban && jawaban[id.toString()]) {
        delete jawaban[id.toString()];
      }

      // Remove the question from progress_jawaban object
      if (progressJawaban && progressJawaban[id.toString()]) {
        delete progressJawaban[id.toString()];
      }

      // Update the answer record
      await db.update(answersTable)
        .set({
          jawaban: jawaban,
          progress_jawaban: progressJawaban
        })
        .where(eq(answersTable.id, answer.id))
        .execute();
    }

    // Finally delete the question
    await db.delete(questionsTable)
      .where(eq(questionsTable.id, id))
      .execute();
  } catch (error) {
    console.error('Question deletion failed:', error);
    throw error;
  }
}

export async function getQuestionsForParticipant(examId: number): Promise<Omit<Question, 'jawaban_benar'>[]> {
  try {
    const results = await db.select({
      id: questionsTable.id,
      exam_id: questionsTable.exam_id,
      soal: questionsTable.soal,
      pilihan: questionsTable.pilihan,
      created_at: questionsTable.created_at
    })
      .from(questionsTable)
      .where(eq(questionsTable.exam_id, examId))
      .execute();

    return results.map(question => ({
      ...question,
      pilihan: question.pilihan as string[] // Cast JSON back to string array
    }));
  } catch (error) {
    console.error('Failed to get questions for participant:', error);
    throw error;
  }
}