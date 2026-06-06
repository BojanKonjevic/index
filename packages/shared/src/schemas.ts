import { z } from "zod"

export const registerSchema = z.object({
  name: z.string().min(3).max(50),
  password: z.string().min(8).max(128),
  bookmarks: z.array(z.string()).optional(),
  group: z.string().optional(),
})

export const loginSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(1),
})

export const addBookmarkSchema = z.object({
  materialId: z.string().min(1),
})

export const removeBookmarkSchema = z.object({
  materialId: z.string().min(1),
})

export const updatePreferencesSchema = z.object({
  group: z.string().optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type AddBookmarkInput = z.infer<typeof addBookmarkSchema>
export type RemoveBookmarkInput = z.infer<typeof removeBookmarkSchema>
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
