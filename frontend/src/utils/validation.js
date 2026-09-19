// Small, dependency-free form validation helpers.
// Each validator takes a value and returns "" (valid) or an error message.

export const isRequired = (value) => {
  if (value === undefined || value === null) return "This field is required";
  if (typeof value === "string" && !value.trim()) return "This field is required";
  return "";
};

export const isEmail = (value) => {
  if (!value) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Enter a valid email address";
};

export const isPhone = (value) => {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? "" : "Enter a valid phone number";
};

export const minLength = (n) => (value) => {
  if (!value) return "";
  return String(value).length >= n ? "" : `Must be at least ${n} characters`;
};

export const isPositiveNumber = (value) => {
  if (value === "" || value === undefined || value === null) return "";
  return Number(value) > 0 ? "" : "Must be greater than 0";
};

/**
 * Validate a values object against a rules map.
 * rules = { fieldName: [validator1, validator2, ...] }
 * Returns an errors object containing only the fields that failed
 * (first failing validator's message per field).
 */
export const validateForm = (values, rules) => {
  const errors = {};
  for (const field in rules) {
    for (const validator of rules[field]) {
      const msg = validator(values[field]);
      if (msg) { errors[field] = msg; break; }
    }
  }
  return errors;
};

// Shared inline styles for an invalid field / its error text —
// import and spread/append so every form looks consistent.
export const errorBorderStyle = { borderColor: "#dc2626" };
export const errorTextStyle = { color: "#dc2626", fontSize: "11px", marginTop: "4px", fontWeight: 500 };
