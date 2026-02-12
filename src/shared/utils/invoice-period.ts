export function getInvoicePeriod(
  year: number,
  month: number,
  dueDay: number
) {
  // month representa o mês de vencimento da fatura

  const startDate = new Date(year, month - 2, dueDay + 1);
  const endDate = new Date(year, month - 1, dueDay);

  // Normaliza horários para evitar bugs com timezone
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}
