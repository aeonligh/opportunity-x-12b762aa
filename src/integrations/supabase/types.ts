export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          id: string
          notes: string | null
          opportunity_id: string
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          opportunity_id: string
          status: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          opportunity_id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_optimizations: {
        Row: {
          created_at: string
          id: string
          score: number
          suggestions: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          score: number
          suggestions: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number
          suggestions?: Json
          user_id?: string
        }
        Relationships: []
      }
      eligibility_results: {
        Row: {
          checked_at: string
          id: string
          opportunity_id: string
          requirements_met: string[] | null
          requirements_missing: string[] | null
          score: number
          user_id: string
        }
        Insert: {
          checked_at?: string
          id?: string
          opportunity_id: string
          requirements_met?: string[] | null
          requirements_missing?: string[] | null
          score: number
          user_id: string
        }
        Update: {
          checked_at?: string
          id?: string
          opportunity_id?: string
          requirements_met?: string[] | null
          requirements_missing?: string[] | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eligibility_results_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_sops: {
        Row: {
          career_goals: string | null
          content: string
          created_at: string
          id: string
          opportunity_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          career_goals?: string | null
          content: string
          created_at?: string
          id?: string
          opportunity_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          career_goals?: string | null
          content?: string
          created_at?: string
          id?: string
          opportunity_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_sops_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      match_scores: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string
          reasoning: string | null
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id: string
          reasoning?: string | null
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string
          reasoning?: string | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_scores_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          ai_insight: string | null
          ai_reasoning: string | null
          apply_url: string | null
          categories: string[] | null
          category: string
          created_at: string
          deadline: string | null
          description: string | null
          discovered_by: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          location: string | null
          match_score_default: number | null
          module: string | null
          opportunity_type: string | null
          organization: string
          source_url: string | null
          tags: string[] | null
          title: string
          trending_score: number | null
          updated_at: string
          verification_score: number | null
          verified: boolean | null
          views_count: number | null
        }
        Insert: {
          ai_insight?: string | null
          ai_reasoning?: string | null
          apply_url?: string | null
          categories?: string[] | null
          category: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          discovered_by?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          location?: string | null
          match_score_default?: number | null
          module?: string | null
          opportunity_type?: string | null
          organization: string
          source_url?: string | null
          tags?: string[] | null
          title: string
          trending_score?: number | null
          updated_at?: string
          verification_score?: number | null
          verified?: boolean | null
          views_count?: number | null
        }
        Update: {
          ai_insight?: string | null
          ai_reasoning?: string | null
          apply_url?: string | null
          categories?: string[] | null
          category?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          discovered_by?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          location?: string | null
          match_score_default?: number | null
          module?: string | null
          opportunity_type?: string | null
          organization?: string
          source_url?: string | null
          tags?: string[] | null
          title?: string
          trending_score?: number | null
          updated_at?: string
          verification_score?: number | null
          verified?: boolean | null
          views_count?: number | null
        }
        Relationships: []
      }
      opportunity_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          opportunity_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          opportunity_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          opportunity_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_analytics_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          career_interests: string[] | null
          country: string | null
          course_of_study: string | null
          created_at: string
          degree_type: string | null
          display_name: string | null
          education_level: string | null
          email_notifications: boolean
          graduation_year: number | null
          id: string
          interests: string[] | null
          level_of_study: string | null
          onboarded: boolean
          preferred_categories: string[] | null
          skill_tags: string[] | null
          university: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          career_interests?: string[] | null
          country?: string | null
          course_of_study?: string | null
          created_at?: string
          degree_type?: string | null
          display_name?: string | null
          education_level?: string | null
          email_notifications?: boolean
          graduation_year?: number | null
          id: string
          interests?: string[] | null
          level_of_study?: string | null
          onboarded?: boolean
          preferred_categories?: string[] | null
          skill_tags?: string[] | null
          university?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          career_interests?: string[] | null
          country?: string | null
          course_of_study?: string | null
          created_at?: string
          degree_type?: string | null
          display_name?: string | null
          education_level?: string | null
          email_notifications?: boolean
          graduation_year?: number | null
          id?: string
          interests?: string[] | null
          level_of_study?: string | null
          onboarded?: boolean
          preferred_categories?: string[] | null
          skill_tags?: string[] | null
          university?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_opportunities: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_opportunities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_reminders: {
        Row: {
          days_before: number
          id: string
          opportunity_id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          days_before: number
          id?: string
          opportunity_id: string
          sent_at?: string
          user_id: string
        }
        Update: {
          days_before?: number
          id?: string
          opportunity_id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sent_reminders_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_documents: {
        Row: {
          document_type: string
          file_url: string
          id: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          document_type: string
          file_url: string
          id?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          document_type?: string
          file_url?: string
          id?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
