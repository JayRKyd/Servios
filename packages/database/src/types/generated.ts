// Auto-generated Supabase types
// Run: supabase gen types typescript --project-id <your-project-id> > src/types/generated.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: { Row: { id: string; email: string; phone: string; roles: string[]; active_role: string; primary_role: string; created_at: string }; Insert: Partial<Database['public']['Tables']['users']['Row']>; Update: Partial<Database['public']['Tables']['users']['Row']> }
      bookings: { Row: { id: string; booking_number: string; status: string; total_amount: number; created_at: string }; Insert: Partial<Database['public']['Tables']['bookings']['Row']>; Update: Partial<Database['public']['Tables']['bookings']['Row']> }
      properties: { Row: { id: string; landlord_id: string; name: string; created_at: string }; Insert: Partial<Database['public']['Tables']['properties']['Row']>; Update: Partial<Database['public']['Tables']['properties']['Row']> }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
