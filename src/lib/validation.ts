const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_PROPERTY_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateImageFile(
  file: File,
  maxSize: number = MAX_PROPERTY_IMAGE_SIZE
): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type "${file.type}". Only JPEG, PNG, WebP, and GIF images are allowed.`,
    };
  }

  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is ${maxMB}MB.`,
    };
  }

  return { valid: true };
}

export function validateAvatarFile(file: File) {
  return validateImageFile(file, MAX_AVATAR_SIZE);
}

export function validatePropertyImage(file: File) {
  return validateImageFile(file, MAX_PROPERTY_IMAGE_SIZE);
}

export const MIN_PASSWORD_LENGTH = 10;

export function validatePasswordStrength(password: string): {
  valid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  error?: string;
} {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      strength: 'weak',
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  if (score < 3) {
    return {
      valid: true,
      strength: 'medium',
    };
  }

  return { valid: true, strength: 'strong' };
}
