import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['admin', 'peserta']);

// Exam status enum
export const examStatusSchema = z.enum(['aktif', 'non-aktif']);

// User schema
export const userSchema = z.object({
  id: z.number(),
  nama: z.string(),
  email: z.string(),
  password: z.string(),
  role: userRoleSchema,
  kelas: z.string().nullable(), // Optional for admin
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  nama: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleSchema,
  kelas: z.string().nullable().optional() // Can be null or undefined
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for updating users
export const updateUserInputSchema = z.object({
  id: z.number(),
  nama: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  kelas: z.string().nullable().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Login input schema
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Reset password input schema
export const resetPasswordInputSchema = z.object({
  id: z.number(),
  newPassword: z.string().min(6)
});

export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

// Exam schema
export const examSchema = z.object({
  id: z.number(),
  judul_ujian: z.string(),
  deskripsi: z.string(),
  tanggal_mulai: z.coerce.date(),
  tanggal_selesai: z.coerce.date(),
  durasi: z.number().int().positive(), // Duration in minutes
  status: examStatusSchema,
  created_at: z.coerce.date()
});

export type Exam = z.infer<typeof examSchema>;

// Input schema for creating exams
export const createExamInputSchema = z.object({
  judul_ujian: z.string(),
  deskripsi: z.string(),
  tanggal_mulai: z.coerce.date(),
  tanggal_selesai: z.coerce.date(),
  durasi: z.number().int().positive(),
  status: examStatusSchema
});

export type CreateExamInput = z.infer<typeof createExamInputSchema>;

// Input schema for updating exams
export const updateExamInputSchema = z.object({
  id: z.number(),
  judul_ujian: z.string().optional(),
  deskripsi: z.string().optional(),
  tanggal_mulai: z.coerce.date().optional(),
  tanggal_selesai: z.coerce.date().optional(),
  durasi: z.number().int().positive().optional(),
  status: examStatusSchema.optional()
});

export type UpdateExamInput = z.infer<typeof updateExamInputSchema>;

// Question schema
export const questionSchema = z.object({
  id: z.number(),
  exam_id: z.number(),
  soal: z.string(),
  pilihan: z.array(z.string()), // Array of choices [A, B, C, D]
  jawaban_benar: z.string(), // Correct answer (A/B/C/D)
  created_at: z.coerce.date()
});

export type Question = z.infer<typeof questionSchema>;

// Input schema for creating questions
export const createQuestionInputSchema = z.object({
  exam_id: z.number(),
  soal: z.string(),
  pilihan: z.array(z.string()).length(4), // Exactly 4 choices
  jawaban_benar: z.enum(['A', 'B', 'C', 'D'])
});

export type CreateQuestionInput = z.infer<typeof createQuestionInputSchema>;

// Input schema for updating questions
export const updateQuestionInputSchema = z.object({
  id: z.number(),
  soal: z.string().optional(),
  pilihan: z.array(z.string()).length(4).optional(),
  jawaban_benar: z.enum(['A', 'B', 'C', 'D']).optional()
});

export type UpdateQuestionInput = z.infer<typeof updateQuestionInputSchema>;

// Answer schema
export const answerSchema = z.object({
  id: z.number(),
  exam_id: z.number(),
  user_id: z.number(),
  jawaban: z.record(z.string(), z.string()), // JSON object: {question_id: answer_choice}
  nilai: z.number().int().nonnegative(), // Automatically calculated score
  waktu_submit: z.coerce.date(),
  is_submitted: z.boolean(),
  progress_jawaban: z.record(z.string(), z.string()).nullable(), // JSON object for autosave
  created_at: z.coerce.date()
});

export type Answer = z.infer<typeof answerSchema>;

// Input schema for creating answers
export const createAnswerInputSchema = z.object({
  exam_id: z.number(),
  user_id: z.number(),
  jawaban: z.record(z.string(), z.string()),
  is_submitted: z.boolean().default(false),
  progress_jawaban: z.record(z.string(), z.string()).nullable().optional()
});

export type CreateAnswerInput = z.infer<typeof createAnswerInputSchema>;

// Input schema for updating progress
export const updateProgressInputSchema = z.object({
  id: z.number(),
  progress_jawaban: z.record(z.string(), z.string())
});

export type UpdateProgressInput = z.infer<typeof updateProgressInputSchema>;

// Input schema for submitting exam
export const submitExamInputSchema = z.object({
  id: z.number(),
  jawaban: z.record(z.string(), z.string())
});

export type SubmitExamInput = z.infer<typeof submitExamInputSchema>;

// Dashboard statistics schema
export const dashboardStatsSchema = z.object({
  totalExams: z.number(),
  totalParticipants: z.number(),
  averageScore: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Exam result schema
export const examResultSchema = z.object({
  user_id: z.number(),
  user_nama: z.string(),
  user_kelas: z.string().nullable(),
  exam_id: z.number(),
  exam_judul: z.string(),
  nilai: z.number(),
  waktu_submit: z.coerce.date(),
  is_submitted: z.boolean()
});

export type ExamResult = z.infer<typeof examResultSchema>;

// Get questions by exam ID input
export const getQuestionsByExamInputSchema = z.object({
  examId: z.number()
});

export type GetQuestionsByExamInput = z.infer<typeof getQuestionsByExamInputSchema>;

// Get exam results by exam ID input
export const getExamResultsInputSchema = z.object({
  examId: z.number()
});

export type GetExamResultsInput = z.infer<typeof getExamResultsInputSchema>;

// Get user answer by exam and user ID input
export const getUserAnswerInputSchema = z.object({
  examId: z.number(),
  userId: z.number()
});

export type GetUserAnswerInput = z.infer<typeof getUserAnswerInputSchema>;

// Delete input schemas
export const deleteByIdInputSchema = z.object({
  id: z.number()
});

export type DeleteByIdInput = z.infer<typeof deleteByIdInputSchema>;