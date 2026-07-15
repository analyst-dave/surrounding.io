export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          location: any | null // geography(Point, 4326)
          created_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          location?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          location?: any | null
          created_at?: string
        }
      }
      connections: {
        Row: {
          id: number
          requester_id: string
          addressee_id: string
          status: 'pending' | 'accepted' | 'blocked'
          created_at: string
        }
        Insert: {
          requester_id: string
          addressee_id: string
          status: 'pending' | 'accepted' | 'blocked'
          created_at?: string
        }
        Update: {
          requester_id?: string
          addressee_id?: string
          status?: 'pending' | 'accepted' | 'blocked'
          created_at?: string
        }
      }
      photo_pins: {
        Row: {
          id: number
          user_id: string
          location: any // geography(Point, 4326)
          image_url: string
          pass_score: number
          pass_tags: Json | null
          pro_tip: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          location: any
          image_url: string
          pass_score: number
          pass_tags?: Json | null
          pro_tip?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          location?: any
          image_url?: string
          pass_score?: number
          pass_tags?: Json | null
          pro_tip?: string | null
          created_at?: string
        }
      }
    }
  }
}
