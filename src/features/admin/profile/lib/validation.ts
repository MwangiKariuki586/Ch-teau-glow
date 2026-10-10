import { z } from 'zod'

/**
 * Profile update validation schema
 */
export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^[\+]?[1-9][\d]{0,15}$/.test(val.replace(/[\s\-\(\)]/g, '')), {
      message: 'Please enter a valid phone number'
    }),
  
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  
  department: z
    .string()
    .max(100, 'Department must be less than 100 characters')
    .optional(),
  
  location: z
    .string()
    .max(100, 'Location must be less than 100 characters')
    .optional(),
  
  avatar_url: z
    .string()
    .url('Invalid avatar URL')
    .optional(),
  
  preferences: z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    darkMode: z.boolean().optional(),
    language: z.string().optional()
  }).optional()
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

/**
 * Password change validation schema
 */
export const passwordChangeSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>