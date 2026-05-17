// Pure rent-status calculator based on the latest payment's next_due_date.
// Uses local date math (no time component) so it works across timezones.

export type RentStatusCode = "no_payment" | "paid" | "due_soon" | "overdue";

export interface RentStatus {
  code: RentStatusCode;
  label: string;
  /** Days until due (positive) or days overdue (negative). null if no payment. */
  daysDiff: number | null;
  detail: string;
  nextDueDate: Date | null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function calculateRentStatus(nextDueDate: string | null | undefined): RentStatus {
  if (!nextDueDate) {
    return {
      code: "no_payment",
      label: "No Payment Recorded",
      daysDiff: null,
      detail: "Awaiting first payment",
      nextDueDate: null,
    };
  }

  // Parse as local date (YYYY-MM-DD) to avoid TZ shifts
  const [y, m, d] = nextDueDate.split("-").map(Number);
  const due = startOfDay(new Date(y, (m || 1) - 1, d || 1));
  const today = startOfDay(new Date());
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.round((due.getTime() - today.getTime()) / msPerDay);

  const fmt = due.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  if (diff < 0) {
    const days = Math.abs(diff);
    return {
      code: "overdue",
      label: "Rent Due",
      daysDiff: diff,
      detail: `${days} day${days === 1 ? "" : "s"} overdue`,
      nextDueDate: due,
    };
  }

  if (diff <= 3) {
    return {
      code: "due_soon",
      label: "Due Soon",
      daysDiff: diff,
      detail: diff === 0 ? "Due today" : `Due in ${diff} day${diff === 1 ? "" : "s"}`,
      nextDueDate: due,
    };
  }

  return {
    code: "paid",
    label: "Rent Paid",
    daysDiff: diff,
    detail: `Next payment due: ${fmt}`,
    nextDueDate: due,
  };
}
