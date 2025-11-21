// Utility to generate a secure temporary password
import crypto from 'crypto';

export function generateTempPassword(): string {
  // Generate a random 12-character password
  const length = 12;
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789!@#$%&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

// Export the function so it can be used in merchant creation
export { generateTempPassword as default };