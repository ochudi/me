// Semester calendar for the Now dashboard. Adjust semesterStart and the
// topic list each semester; everything downstream derives from these.

export const semesterStart = "2026-03-09";
export const weekCount = 15;
export const courseCode = "COS 102";

// Weeks 1-8 mirror the published lesson notes; 9-15 carry the rest of the
// semester through to exams.
const topics: string[] = [
  "Problem solving foundations",
  "Introduction to Python",
  "Data types and conversion",
  "Flow of control",
  "Functions and modularity",
  "Object-oriented programming",
  "Arrays with NumPy",
  "Data analysis with Pandas",
  "Continuous assessment",
  "Files and exceptions",
  "Mini project",
  "Group projects",
  "Revision",
  "Examinations",
  "Examinations",
];

export function topicFor(week: number): string | null {
  return topics[week - 1] ?? null;
}

export type TeachingWeek = { week: number; topic: string | null };

/**
 * The teaching week containing `date`, or null outside the semester.
 * Weeks run Monday to Sunday from semesterStart; day arithmetic happens in
 * UTC so the result does not depend on server timezone.
 */
export function teachingWeekFor(date: Date): TeachingWeek | null {
  const start = new Date(`${semesterStart}T00:00:00Z`).getTime();
  const dayMs = 86400000;
  const todayUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const days = Math.floor((todayUtc - start) / dayMs);
  if (days < 0) return null;
  const week = Math.floor(days / 7) + 1;
  if (week > weekCount) return null;
  return { week, topic: topicFor(week) };
}
