// frontend/src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to combine classNames conditionally with Tailwind merge capabilities.
 * @param  {...any} inputs - Class names or arrays of class names.
 * @returns {string} - Combined and merged className string.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
