import { type CreateQuestionInput, type UpdateQuestionInput, type Question, type GetQuestionsByExamInput } from '../schema';

export async function createQuestion(input: CreateQuestionInput): Promise<Question> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to create a new question for a specific exam.
    // Should validate that exam exists and pilihan array has exactly 4 items.
    return {
        id: 0,
        exam_id: input.exam_id,
        soal: input.soal,
        pilihan: input.pilihan,
        jawaban_benar: input.jawaban_benar,
        created_at: new Date()
    } as Question;
}

export async function getQuestionsByExamId(input: GetQuestionsByExamInput): Promise<Question[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch all questions for a specific exam.
    // For participants, should exclude jawaban_benar field for security.
    return [];
}

export async function getQuestionById(id: number): Promise<Question | null> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch a specific question by ID.
    return null;
}

export async function updateQuestion(input: UpdateQuestionInput): Promise<Question> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to update question information in the database.
    // Should validate that pilihan array has exactly 4 items if provided.
    return {} as Question;
}

export async function deleteQuestion(id: number): Promise<void> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to delete a question from the database.
    // Should also clean up related answer data.
}

export async function getQuestionsForParticipant(examId: number): Promise<Omit<Question, 'jawaban_benar'>[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to get questions for participants without correct answers.
    // Should exclude jawaban_benar field to prevent cheating.
    return [];
}