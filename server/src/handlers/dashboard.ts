import { db } from '../db';
import { usersTable, examsTable, answersTable } from '../db/schema';
import { type DashboardStats, type ExamResult, type GetExamResultsInput } from '../schema';
import { eq, count, avg, and } from 'drizzle-orm';

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total number of exams
    const totalExamsResult = await db
      .select({ count: count() })
      .from(examsTable)
      .execute();

    // Get total number of participants (users with role 'peserta')
    const totalParticipantsResult = await db
      .select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.role, 'peserta'))
      .execute();

    // Get average score across all submitted exams
    const averageScoreResult = await db
      .select({ avg: avg(answersTable.nilai) })
      .from(answersTable)
      .where(eq(answersTable.is_submitted, true))
      .execute();

    return {
      totalExams: totalExamsResult[0]?.count || 0,
      totalParticipants: totalParticipantsResult[0]?.count || 0,
      averageScore: parseFloat(averageScoreResult[0]?.avg || '0')
    };
  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
}

export async function getExamResults(input: GetExamResultsInput): Promise<ExamResult[]> {
  try {
    const results = await db
      .select({
        user_id: answersTable.user_id,
        user_nama: usersTable.nama,
        user_kelas: usersTable.kelas,
        exam_id: answersTable.exam_id,
        exam_judul: examsTable.judul_ujian,
        nilai: answersTable.nilai,
        waktu_submit: answersTable.waktu_submit,
        is_submitted: answersTable.is_submitted
      })
      .from(answersTable)
      .innerJoin(usersTable, eq(answersTable.user_id, usersTable.id))
      .innerJoin(examsTable, eq(answersTable.exam_id, examsTable.id))
      .where(eq(answersTable.exam_id, input.examId))
      .execute();

    return results;
  } catch (error) {
    console.error('Exam results retrieval failed:', error);
    throw error;
  }
}

export async function getAllExamResults(): Promise<ExamResult[]> {
  try {
    const results = await db
      .select({
        user_id: answersTable.user_id,
        user_nama: usersTable.nama,
        user_kelas: usersTable.kelas,
        exam_id: answersTable.exam_id,
        exam_judul: examsTable.judul_ujian,
        nilai: answersTable.nilai,
        waktu_submit: answersTable.waktu_submit,
        is_submitted: answersTable.is_submitted
      })
      .from(answersTable)
      .innerJoin(usersTable, eq(answersTable.user_id, usersTable.id))
      .innerJoin(examsTable, eq(answersTable.exam_id, examsTable.id))
      .execute();

    return results;
  } catch (error) {
    console.error('All exam results retrieval failed:', error);
    throw error;
  }
}

export async function exportExamResultsToCSV(examId?: number): Promise<string> {
  try {
    let results: ExamResult[];

    if (examId !== undefined) {
      results = await getExamResults({ examId });
    } else {
      results = await getAllExamResults();
    }

    // Create CSV header
    const headers = [
      'User ID',
      'Nama Peserta',
      'Kelas',
      'Exam ID',
      'Judul Ujian',
      'Nilai',
      'Waktu Submit',
      'Status Submit'
    ];

    // Create CSV rows
    const rows = results.map(result => [
      result.user_id.toString(),
      `"${result.user_nama}"`, // Wrap in quotes to handle commas in names
      result.user_kelas || '', // Handle null values
      result.exam_id.toString(),
      `"${result.exam_judul}"`, // Wrap in quotes to handle commas in titles
      result.nilai.toString(),
      result.waktu_submit.toISOString(),
      result.is_submitted ? 'Submitted' : 'Not Submitted'
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  } catch (error) {
    console.error('CSV export failed:', error);
    throw error;
  }
}