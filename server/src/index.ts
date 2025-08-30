import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  loginInputSchema,
  createUserInputSchema,
  updateUserInputSchema,
  resetPasswordInputSchema,
  createExamInputSchema,
  updateExamInputSchema,
  createQuestionInputSchema,
  updateQuestionInputSchema,
  getQuestionsByExamInputSchema,
  createAnswerInputSchema,
  updateProgressInputSchema,
  submitExamInputSchema,
  getUserAnswerInputSchema,
  getExamResultsInputSchema,
  deleteByIdInputSchema,
  userRoleSchema
} from './schema';

// Import handlers
import { loginUser } from './handlers/auth';
import { 
  createUser, 
  getAllUsers, 
  getUsersByRole, 
  getUserById, 
  updateUser, 
  deleteUser, 
  resetUserPassword 
} from './handlers/users';
import { 
  createExam, 
  getAllExams, 
  getActiveExams, 
  getExamById, 
  updateExam, 
  deleteExam, 
  getExamsForParticipant 
} from './handlers/exams';
import { 
  createQuestion, 
  getQuestionsByExamId, 
  getQuestionById, 
  updateQuestion, 
  deleteQuestion, 
  getQuestionsForParticipant 
} from './handlers/questions';
import { 
  createAnswer, 
  getUserAnswer, 
  updateProgress, 
  submitExam, 
  getAnswersByExamId 
} from './handlers/answers';
import { 
  getDashboardStats, 
  getExamResults, 
  getAllExamResults, 
  exportExamResultsToCSV 
} from './handlers/dashboard';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getAllUsers: publicProcedure
    .query(() => getAllUsers()),

  getUsersByRole: publicProcedure
    .input(userRoleSchema)
    .query(({ input }) => getUsersByRole(input)),

  getUserById: publicProcedure
    .input(deleteByIdInputSchema)
    .query(({ input }) => getUserById(input.id)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  deleteUser: publicProcedure
    .input(deleteByIdInputSchema)
    .mutation(({ input }) => deleteUser(input.id)),

  resetUserPassword: publicProcedure
    .input(resetPasswordInputSchema)
    .mutation(({ input }) => resetUserPassword(input)),

  // Exam management routes
  createExam: publicProcedure
    .input(createExamInputSchema)
    .mutation(({ input }) => createExam(input)),

  getAllExams: publicProcedure
    .query(() => getAllExams()),

  getActiveExams: publicProcedure
    .query(() => getActiveExams()),

  getExamById: publicProcedure
    .input(deleteByIdInputSchema)
    .query(({ input }) => getExamById(input.id)),

  updateExam: publicProcedure
    .input(updateExamInputSchema)
    .mutation(({ input }) => updateExam(input)),

  deleteExam: publicProcedure
    .input(deleteByIdInputSchema)
    .mutation(({ input }) => deleteExam(input.id)),

  getExamsForParticipant: publicProcedure
    .input(deleteByIdInputSchema)
    .query(({ input }) => getExamsForParticipant(input.id)),

  // Question management routes
  createQuestion: publicProcedure
    .input(createQuestionInputSchema)
    .mutation(({ input }) => createQuestion(input)),

  getQuestionsByExamId: publicProcedure
    .input(getQuestionsByExamInputSchema)
    .query(({ input }) => getQuestionsByExamId(input)),

  getQuestionById: publicProcedure
    .input(deleteByIdInputSchema)
    .query(({ input }) => getQuestionById(input.id)),

  updateQuestion: publicProcedure
    .input(updateQuestionInputSchema)
    .mutation(({ input }) => updateQuestion(input)),

  deleteQuestion: publicProcedure
    .input(deleteByIdInputSchema)
    .mutation(({ input }) => deleteQuestion(input.id)),

  getQuestionsForParticipant: publicProcedure
    .input(getQuestionsByExamInputSchema)
    .query(({ input }) => getQuestionsForParticipant(input.examId)),

  // Answer and exam taking routes
  createAnswer: publicProcedure
    .input(createAnswerInputSchema)
    .mutation(({ input }) => createAnswer(input)),

  getUserAnswer: publicProcedure
    .input(getUserAnswerInputSchema)
    .query(({ input }) => getUserAnswer(input)),

  updateProgress: publicProcedure
    .input(updateProgressInputSchema)
    .mutation(({ input }) => updateProgress(input)),

  submitExam: publicProcedure
    .input(submitExamInputSchema)
    .mutation(({ input }) => submitExam(input)),

  getAnswersByExamId: publicProcedure
    .input(getQuestionsByExamInputSchema)
    .query(({ input }) => getAnswersByExamId(input.examId)),

  // Dashboard and reporting routes
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),

  getExamResults: publicProcedure
    .input(getExamResultsInputSchema)
    .query(({ input }) => getExamResults(input)),

  getAllExamResults: publicProcedure
    .query(() => getAllExamResults()),

  exportExamResultsToCSV: publicProcedure
    .input(getQuestionsByExamInputSchema.partial())
    .query(({ input }) => exportExamResultsToCSV(input.examId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();