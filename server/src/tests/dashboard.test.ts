import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, examsTable, answersTable } from '../db/schema';
import { type GetExamResultsInput } from '../schema';
import { getDashboardStats, getExamResults, getAllExamResults, exportExamResultsToCSV } from '../handlers/dashboard';

describe('dashboard handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  async function createTestData() {
    // Create admin user
    const adminUser = await db.insert(usersTable).values({
      nama: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      kelas: null
    }).returning().execute();

    // Create participant users
    const user1 = await db.insert(usersTable).values({
      nama: 'Peserta Satu',
      email: 'peserta1@test.com',
      password: 'password123',
      role: 'peserta',
      kelas: 'XII IPA 1'
    }).returning().execute();

    const user2 = await db.insert(usersTable).values({
      nama: 'Peserta Dua',
      email: 'peserta2@test.com',
      password: 'password123',
      role: 'peserta',
      kelas: 'XII IPA 2'
    }).returning().execute();

    // Create exams
    const exam1 = await db.insert(examsTable).values({
      judul_ujian: 'Ujian Matematika',
      deskripsi: 'Ujian matematika semester 1',
      tanggal_mulai: new Date('2024-01-15T08:00:00Z'),
      tanggal_selesai: new Date('2024-01-15T10:00:00Z'),
      durasi: 120,
      status: 'aktif'
    }).returning().execute();

    const exam2 = await db.insert(examsTable).values({
      judul_ujian: 'Ujian Fisika',
      deskripsi: 'Ujian fisika semester 1',
      tanggal_mulai: new Date('2024-01-16T08:00:00Z'),
      tanggal_selesai: new Date('2024-01-16T10:00:00Z'),
      durasi: 90,
      status: 'aktif'
    }).returning().execute();

    // Create answers (exam results)
    const answer1 = await db.insert(answersTable).values({
      exam_id: exam1[0].id,
      user_id: user1[0].id,
      jawaban: { '1': 'A', '2': 'B', '3': 'C' },
      nilai: 85,
      waktu_submit: new Date('2024-01-15T09:30:00Z'),
      is_submitted: true,
      progress_jawaban: null
    }).returning().execute();

    const answer2 = await db.insert(answersTable).values({
      exam_id: exam1[0].id,
      user_id: user2[0].id,
      jawaban: { '1': 'B', '2': 'A', '3': 'C' },
      nilai: 92,
      waktu_submit: new Date('2024-01-15T09:45:00Z'),
      is_submitted: true,
      progress_jawaban: null
    }).returning().execute();

    const answer3 = await db.insert(answersTable).values({
      exam_id: exam2[0].id,
      user_id: user1[0].id,
      jawaban: { '1': 'A', '2': 'B' },
      nilai: 78,
      waktu_submit: new Date('2024-01-16T09:15:00Z'),
      is_submitted: true,
      progress_jawaban: null
    }).returning().execute();

    // Create one unsubmitted answer
    const answer4 = await db.insert(answersTable).values({
      exam_id: exam2[0].id,
      user_id: user2[0].id,
      jawaban: {},
      nilai: 0,
      waktu_submit: new Date(),
      is_submitted: false,
      progress_jawaban: { '1': 'A' }
    }).returning().execute();

    return {
      users: [adminUser[0], user1[0], user2[0]],
      exams: [exam1[0], exam2[0]],
      answers: [answer1[0], answer2[0], answer3[0], answer4[0]]
    };
  }

  describe('getDashboardStats', () => {
    it('should return correct dashboard statistics with data', async () => {
      await createTestData();

      const stats = await getDashboardStats();

      expect(stats.totalExams).toEqual(2);
      expect(stats.totalParticipants).toEqual(2); // Only peserta users
      expect(stats.averageScore).toBeCloseTo(85); // (85 + 92 + 78) / 3 = 85
    });

    it('should return zero statistics when no data exists', async () => {
      const stats = await getDashboardStats();

      expect(stats.totalExams).toEqual(0);
      expect(stats.totalParticipants).toEqual(0);
      expect(stats.averageScore).toEqual(0);
    });

    it('should only count submitted answers in average score', async () => {
      const testData = await createTestData();

      const stats = await getDashboardStats();

      // Should only count the 3 submitted answers, not the unsubmitted one
      expect(stats.averageScore).toBeCloseTo(85); // (85 + 92 + 78) / 3
    });
  });

  describe('getExamResults', () => {
    it('should return results for specific exam', async () => {
      const testData = await createTestData();
      const input: GetExamResultsInput = { examId: testData.exams[0].id };

      const results = await getExamResults(input);

      expect(results).toHaveLength(2);
      
      // Check first result
      expect(results[0].user_nama).toEqual('Peserta Satu');
      expect(results[0].user_kelas).toEqual('XII IPA 1');
      expect(results[0].exam_judul).toEqual('Ujian Matematika');
      expect(results[0].nilai).toEqual(85);
      expect(results[0].is_submitted).toEqual(true);
      
      // Check second result
      expect(results[1].user_nama).toEqual('Peserta Dua');
      expect(results[1].user_kelas).toEqual('XII IPA 2');
      expect(results[1].exam_judul).toEqual('Ujian Matematika');
      expect(results[1].nilai).toEqual(92);
      expect(results[1].is_submitted).toEqual(true);
    });

    it('should return empty array for non-existent exam', async () => {
      await createTestData();
      const input: GetExamResultsInput = { examId: 9999 };

      const results = await getExamResults(input);

      expect(results).toHaveLength(0);
    });

    it('should include both submitted and unsubmitted answers', async () => {
      const testData = await createTestData();
      const input: GetExamResultsInput = { examId: testData.exams[1].id };

      const results = await getExamResults(input);

      expect(results).toHaveLength(2);
      
      // Find submitted and unsubmitted results
      const submittedResult = results.find(r => r.is_submitted);
      const unsubmittedResult = results.find(r => !r.is_submitted);
      
      expect(submittedResult).toBeDefined();
      expect(submittedResult!.nilai).toEqual(78);
      
      expect(unsubmittedResult).toBeDefined();
      expect(unsubmittedResult!.nilai).toEqual(0);
    });
  });

  describe('getAllExamResults', () => {
    it('should return all exam results from all exams', async () => {
      await createTestData();

      const results = await getAllExamResults();

      expect(results).toHaveLength(4); // All answers from both exams
      
      // Check that results from different exams are included
      const mathResults = results.filter(r => r.exam_judul === 'Ujian Matematika');
      const physicsResults = results.filter(r => r.exam_judul === 'Ujian Fisika');
      
      expect(mathResults).toHaveLength(2);
      expect(physicsResults).toHaveLength(2);
    });

    it('should return empty array when no results exist', async () => {
      const results = await getAllExamResults();

      expect(results).toHaveLength(0);
    });
  });

  describe('exportExamResultsToCSV', () => {
    it('should export specific exam results to CSV format', async () => {
      const testData = await createTestData();

      const csvContent = await exportExamResultsToCSV(testData.exams[0].id);

      expect(csvContent).toContain('User ID,Nama Peserta,Kelas,Exam ID,Judul Ujian,Nilai,Waktu Submit,Status Submit');
      expect(csvContent).toContain('"Peserta Satu"');
      expect(csvContent).toContain('"Peserta Dua"');
      expect(csvContent).toContain('"Ujian Matematika"');
      expect(csvContent).toContain('85');
      expect(csvContent).toContain('92');
      expect(csvContent).toContain('Submitted');
      
      // Should only contain results from the specified exam
      expect(csvContent).not.toContain('"Ujian Fisika"');
      
      // Count rows (header + 2 data rows)
      const rows = csvContent.split('\n');
      expect(rows).toHaveLength(3);
    });

    it('should export all exam results when no examId provided', async () => {
      await createTestData();

      const csvContent = await exportExamResultsToCSV();

      expect(csvContent).toContain('User ID,Nama Peserta,Kelas,Exam ID,Judul Ujian,Nilai,Waktu Submit,Status Submit');
      expect(csvContent).toContain('"Ujian Matematika"');
      expect(csvContent).toContain('"Ujian Fisika"');
      expect(csvContent).toContain('Submitted');
      expect(csvContent).toContain('Not Submitted');
      
      // Count rows (header + 4 data rows)
      const rows = csvContent.split('\n');
      expect(rows).toHaveLength(5);
    });

    it('should handle null kelas values in CSV export', async () => {
      // Create user with null kelas
      const user = await db.insert(usersTable).values({
        nama: 'User No Class',
        email: 'noclass@test.com',
        password: 'password123',
        role: 'peserta',
        kelas: null
      }).returning().execute();

      const exam = await db.insert(examsTable).values({
        judul_ujian: 'Test Exam',
        deskripsi: 'Test description',
        tanggal_mulai: new Date(),
        tanggal_selesai: new Date(),
        durasi: 60,
        status: 'aktif'
      }).returning().execute();

      await db.insert(answersTable).values({
        exam_id: exam[0].id,
        user_id: user[0].id,
        jawaban: {},
        nilai: 50,
        waktu_submit: new Date(),
        is_submitted: true,
        progress_jawaban: null
      }).execute();

      const csvContent = await exportExamResultsToCSV();
      
      // Should handle null kelas as empty string
      expect(csvContent).toContain('User No Class');
      const userRow = csvContent.split('\n').find(row => row.includes('User No Class'));
      expect(userRow).toBeDefined();
      
      // Check that the kelas field (3rd column) is empty
      const columns = userRow!.split(',');
      expect(columns[2]).toEqual(''); // Empty string for null kelas
    });

    it('should return empty CSV with headers when no data exists', async () => {
      const csvContent = await exportExamResultsToCSV();

      expect(csvContent).toEqual('User ID,Nama Peserta,Kelas,Exam ID,Judul Ujian,Nilai,Waktu Submit,Status Submit');
    });
  });
});