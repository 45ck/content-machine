export type InquirerLike = {
  prompt: <T extends Record<string, unknown>>(question: unknown) => Promise<T>;
};

let cachedInquirer: InquirerLike | null | undefined;

export async function getInquirer(): Promise<InquirerLike> {
  if (cachedInquirer) return cachedInquirer;
  const mod = await import('inquirer');
  cachedInquirer = ((mod as unknown as { default?: unknown }).default ?? mod) as InquirerLike;
  return cachedInquirer;
}

export function resetInquirerCache(): void {
  cachedInquirer = undefined;
}
