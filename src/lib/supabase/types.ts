export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Add your database types here as you create tables
// Example:
// export interface Database {
//   public: {
//     Tables: {
//       users: {
//         Row: {
//           id: string
//           email: string
//           created_at: string
//         }
//         Insert: {
//           id?: string
//           email: string
//           created_at?: string
//         }
//         Update: {
//           id?: string
//           email?: string
//           created_at?: string
//         }
//       }
//     }
//   }
// }
