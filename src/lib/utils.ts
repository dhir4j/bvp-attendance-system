import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFlaskBackend() {
  return process.env.FLASK_BACKEND_URL || 'https://www.attendance.scrape.ink';
}
