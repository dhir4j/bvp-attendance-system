import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFlaskBackend() {
  // This should be replaced with your actual Flask backend URL
  // For local development, it might be http://127.0.0.1:5000
  return process.env.FLASK_BACKEND_URL || 'http://127.0.0.1:5000';
}
