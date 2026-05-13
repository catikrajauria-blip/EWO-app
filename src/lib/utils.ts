import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEwoId(date: Date) {
  return `EWO-${format(date, 'ddMMyy-HHmm')}`;
}
