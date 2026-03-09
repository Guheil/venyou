import type { SavedEvent } from "@/lib/types";

export function formatPeso(value: number) {
  return `\u20B1${Math.round(value).toLocaleString()}`;
}

export function totalBudget(event: SavedEvent) {
  if (event.budgetType === "per-head") {
    return {
      min: event.budgetMin * event.pax,
      max: event.budgetMax * event.pax,
    };
  }

  return {
    min: event.budgetMin,
    max: event.budgetMax,
  };
}

export function midpointBudget(event: SavedEvent) {
  const budget = totalBudget(event);
  return Math.round((budget.min + budget.max) / 2);
}

export function formatBudgetRange(event: SavedEvent) {
  const budget = totalBudget(event);
  return `${formatPeso(budget.min)} - ${formatPeso(budget.max)}`;
}

export function formatBudgetInput(event: SavedEvent) {
  if (event.budgetType === "per-head") {
    return `${formatPeso(event.budgetMin)} - ${formatPeso(event.budgetMax)}/head`;
  }

  return `${formatPeso(event.budgetMin)} - ${formatPeso(event.budgetMax)} total`;
}
