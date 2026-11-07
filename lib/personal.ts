import { z } from "zod";
export const incomeCategories = [
  "Salary",
  "Freelance",
  "Other income",
] as const;
export const expenseCategories = [
  "Housing",
  "Food",
  "Transport",
  "Utilities",
  "Health",
  "Leisure",
  "Debt repayment",
  "Other expense",
] as const;
export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a valid month");
const amount = z.number().int().min(1).max(10000000000);
const pastDate = z.iso
  .date()
  .refine(
    (d) => d <= new Date().toISOString().slice(0, 10),
    "Confirmed entries cannot have a future date",
  );
const transactionFields = {
  type: z.enum(["income", "expense"]),
  amount,
  date: pastDate,
  category: z.string().max(40),
  note: z.string().max(300),
  confirmed: z.literal(true),
};
export const transactionSchema = z
  .object(transactionFields)
  .strict()
  .refine(
    (t) =>
      (t.type === "income" ? incomeCategories : expenseCategories).some(
        (c) => c === t.category,
      ),
    "Category does not match entry type",
  );
const transactionInput = z
  .object({
    action: z.literal("transaction-save"),
    id: z.string().uuid().optional(),
    ...transactionFields,
  })
  .strict()
  .refine(
    (t) =>
      (t.type === "income" ? incomeCategories : expenseCategories).some(
        (c) => c === t.category,
      ),
    "Category does not match entry type",
  );
export const personalActionSchema = z.discriminatedUnion("action", [
  transactionInput,
  z
    .object({ action: z.literal("transaction-delete"), id: z.string().uuid() })
    .strict(),
  z
    .object({
      action: z.literal("goal-save"),
      id: z.string().uuid().optional(),
      name: z.string().trim().min(2).max(70),
      target: amount,
      due: z.union([z.iso.date(), z.literal("")]),
    })
    .strict(),
  z
    .object({ action: z.literal("goal-delete"), id: z.string().uuid() })
    .strict(),
  z
    .object({
      action: z.literal("contribution-add"),
      goalId: z.string().uuid(),
      amount,
      date: pastDate,
      note: z.string().max(300),
      confirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("contribution-delete"),
      goalId: z.string().uuid(),
      id: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("budget-save"),
      category: z.enum(expenseCategories),
      month: monthSchema,
      limit: z.number().int().min(0).max(10000000000),
    })
    .strict(),
  z
    .object({ action: z.literal("budget-delete"), id: z.string().uuid() })
    .strict(),
  z
    .object({ action: z.literal("load-demo"), confirmed: z.literal(true) })
    .strict(),
]);
export type PersonalAction = z.infer<typeof personalActionSchema>;
export type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  category: string;
  note: string;
  confirmed: true;
  fictional: boolean;
};
export type Contribution = {
  id: string;
  amount: number;
  date: string;
  note: string;
  fictional: boolean;
};
export type Goal = {
  id: string;
  name: string;
  target: number;
  due: string;
  contributions: Contribution[];
  fictional: boolean;
};
export type Budget = {
  id: string;
  month: string;
  category: string;
  limit: number;
  fictional: boolean;
};
export type PersonalData = {
  revision: number;
  transactions: Transaction[];
  goals: Goal[];
  budgets: Budget[];
  events: { id: string; at: string; kind: string; recordId: string }[];
  memorySync?: { revision: number; at: string; bank?: string };
};
export function emptyPersonal(): PersonalData {
  return { revision: 0, transactions: [], goals: [], budgets: [], events: [] };
}
export function sumPaise(values: number[]) {
  const result = values.reduce((s, n) => s + n, 0);
  if (!Number.isSafeInteger(result))
    throw Error("Total exceeds supported exact INR range");
  return result;
}
function rateBps(net: number, income: number) {
  if (income === 0) return null;
  const n = BigInt(Math.abs(net)) * 10000n,
    d = BigInt(income);
  return Number((n + d / 2n) / d) * (net < 0 ? -1 : 1);
}
export function monthlySummary(data: PersonalData, month: string) {
  monthSchema.parse(month);
  const entries = data.transactions.filter(
    (t) => t.confirmed && t.date.startsWith(month + "-"),
  );
  const income = sumPaise(
      entries.filter((t) => t.type === "income").map((t) => t.amount),
    ),
    expenses = sumPaise(
      entries.filter((t) => t.type === "expense").map((t) => t.amount),
    ),
    net = income - expenses;
  const categories = expenseCategories.map((category) => ({
    category,
    amount: sumPaise(
      entries
        .filter((t) => t.type === "expense" && t.category === category)
        .map((t) => t.amount),
    ),
  }));
  const allocations = sumPaise(
    data.goals.flatMap((g) =>
      g.contributions
        .filter((c) => c.date.startsWith(month + "-"))
        .map((c) => c.amount),
    ),
  );
  const unallocatedSurplus = Math.max(0, net - allocations);
  const starterSaving = Math.min(unallocatedSurplus, Math.floor(income / 10));
  return {
    month,
    income,
    expenses,
    net,
    savingsRateBps: rateBps(net, income),
    allocations,
    unallocatedSurplus,
    starterSaving,
    categories,
    entryCount: entries.length,
    budgets: data.budgets
      .filter((b) => b.month === month)
      .map((b) => ({
        ...b,
        spent: categories.find((c) => c.category === b.category)?.amount || 0,
      })),
    goals: data.goals.map((g) => ({
      ...g,
      contributed: sumPaise(g.contributions.map((c) => c.amount)),
    })),
  };
}
