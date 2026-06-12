// Semester calendar for the Now dashboard. Adjust semesterStart and the
// topic list each semester; everything downstream derives from these.

export const semesterStart = "2026-03-09";
export const weekCount = 15;
export const courseCode = "COS 102";

const topics: string[] = [
  "Problem solving foundations",
  "Algorithms and flowcharts",
  "Pseudocode",
  "Object-oriented programming",
  "Selection",
  "Iteration",
  "Functions and modularity",
  "Mid-semester test",
  "Lists and arrays",
  "Strings",
  "File handling",
  "Debugging and testing",
  "Group projects",
  "Revision",
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
