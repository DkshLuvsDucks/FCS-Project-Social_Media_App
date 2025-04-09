import { toast } from 'react-hot-toast';

// Regular expression to detect potential SQL injection patterns
const SQL_INJ_REGEX = /["'!=;\\-]/;

/**
 * Validates input against SQL injection patterns
 * @param value The string to validate
 * @returns true if valid (no SQL injection patterns), false otherwise
 */
export const validateAuthInput = (value: string): boolean => {
  return !SQL_INJ_REGEX.test(value);
};

/**
 * Validates form input against SQL injection patterns
 * @param value The string to validate
 * @param fieldName The name of the field being validated (for error messages)
 * @returns The validated string or throws an error
 */
export const validateFormInput = (value: string, fieldName: string): string => {
  if (SQL_INJ_REGEX.test(value)) {
    toast.error(`Invalid characters detected in ${fieldName}`);
    throw new Error(`Invalid characters detected in ${fieldName}`);
  }
  return value;
};

/**
 * Sanitizes an object's string properties against SQL injection
 * @param data Object with string values to sanitize
 * @returns A new object with sanitized values
 */
export const sanitizeInputObject = <T extends Record<string, any>>(data: T): T => {
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      // Remove potential SQL injection characters from string values
      if (SQL_INJ_REGEX.test(sanitized[key])) {
        sanitized[key] = sanitized[key].replace(SQL_INJ_REGEX, '');
      }
    }
  }
  
  return sanitized;
}; 