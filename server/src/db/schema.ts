import { serial, text, pgTable, timestamp, integer, boolean, json, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum definitions
export const userRoleEnum = pgEnum('user_role', ['admin', 'peserta']);
export const examStatusEnum = pgEnum('exam_status', ['aktif', 'non-aktif']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  nama: text('nama').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: userRoleEnum('role').notNull(),
  kelas: text('kelas'), // Nullable by default, optional for admin
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Exams table
export const examsTable = pgTable('exams', {
  id: serial('id').primaryKey(),
  judul_ujian: text('judul_ujian').notNull(),
  deskripsi: text('deskripsi').notNull(),
  tanggal_mulai: timestamp('tanggal_mulai').notNull(),
  tanggal_selesai: timestamp('tanggal_selesai').notNull(),
  durasi: integer('durasi').notNull(), // Duration in minutes
  status: examStatusEnum('status').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Questions table
export const questionsTable = pgTable('questions', {
  id: serial('id').primaryKey(),
  exam_id: integer('exam_id').references(() => examsTable.id).notNull(),
  soal: text('soal').notNull(),
  pilihan: json('pilihan').notNull(), // Array of strings: A, B, C, D
  jawaban_benar: text('jawaban_benar').notNull(), // Correct answer (A/B/C/D)
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Answers table
export const answersTable = pgTable('answers', {
  id: serial('id').primaryKey(),
  exam_id: integer('exam_id').references(() => examsTable.id).notNull(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  jawaban: json('jawaban').notNull(), // JSON object: {question_id: answer_choice}
  nilai: integer('nilai').notNull().default(0), // Automatically calculated score
  waktu_submit: timestamp('waktu_submit').notNull(),
  is_submitted: boolean('is_submitted').notNull().default(false),
  progress_jawaban: json('progress_jawaban'), // JSON object for autosave, nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  answers: many(answersTable),
}));

export const examsRelations = relations(examsTable, ({ many }) => ({
  questions: many(questionsTable),
  answers: many(answersTable),
}));

export const questionsRelations = relations(questionsTable, ({ one }) => ({
  exam: one(examsTable, {
    fields: [questionsTable.exam_id],
    references: [examsTable.id],
  }),
}));

export const answersRelations = relations(answersTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [answersTable.user_id],
    references: [usersTable.id],
  }),
  exam: one(examsTable, {
    fields: [answersTable.exam_id],
    references: [examsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Exam = typeof examsTable.$inferSelect;
export type NewExam = typeof examsTable.$inferInsert;

export type Question = typeof questionsTable.$inferSelect;
export type NewQuestion = typeof questionsTable.$inferInsert;

export type Answer = typeof answersTable.$inferSelect;
export type NewAnswer = typeof answersTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  exams: examsTable,
  questions: questionsTable,
  answers: answersTable,
};

export const tableRelations = {
  usersRelations,
  examsRelations,
  questionsRelations,
  answersRelations,
};