import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Slučuje Tailwind třídy a řeší konflikty (poslední vyhrává). Používej všude. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
