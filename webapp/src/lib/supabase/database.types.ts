export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_admin: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          is_admin?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_admin?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      project_participants: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_participants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          area: string | null
          building_area: number | null
          building_area_m2: number | null
          building_image_url: string | null
          category: string | null
          client_category: string | null
          client_name: string | null
          client_type: string | null
          completion_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          environmental_class: string | null
          environmental_classification: string | null
          gfa_m2: number | null
          gross_floor_area: number | null
          id: string
          main_contractor: string | null
          model_3d_url: string | null
          num_apartments: number | null
          num_buildings: number | null
          num_floors: number | null
          number_of_apartments: number | null
          number_of_floors: number | null
          other_project_info: string | null
          project_type: string | null
          start_date: string | null
          status: string
          supplementary_tender_document_url: string | null
          tender_document_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          building_area?: number | null
          building_area_m2?: number | null
          building_image_url?: string | null
          category?: string | null
          client_category?: string | null
          client_name?: string | null
          client_type?: string | null
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          environmental_class?: string | null
          environmental_classification?: string | null
          gfa_m2?: number | null
          gross_floor_area?: number | null
          id?: string
          main_contractor?: string | null
          model_3d_url?: string | null
          num_apartments?: number | null
          num_buildings?: number | null
          num_floors?: number | null
          number_of_apartments?: number | null
          number_of_floors?: number | null
          other_project_info?: string | null
          project_type?: string | null
          start_date?: string | null
          status?: string
          supplementary_tender_document_url?: string | null
          tender_document_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          building_area?: number | null
          building_area_m2?: number | null
          building_image_url?: string | null
          category?: string | null
          client_category?: string | null
          client_name?: string | null
          client_type?: string | null
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          environmental_class?: string | null
          environmental_classification?: string | null
          gfa_m2?: number | null
          gross_floor_area?: number | null
          id?: string
          main_contractor?: string | null
          model_3d_url?: string | null
          num_apartments?: number | null
          num_buildings?: number | null
          num_floors?: number | null
          number_of_apartments?: number | null
          number_of_floors?: number | null
          other_project_info?: string | null
          project_type?: string | null
          start_date?: string | null
          status?: string
          supplementary_tender_document_url?: string | null
          tender_document_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_access_requests: {
        Row: {
          created_at: string
          id: string
          quote_id: string
          requester_user_id: string
          status: string
          uploader_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quote_id: string
          requester_user_id: string
          status?: string
          uploader_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quote_id?: string
          requester_user_id?: string
          status?: string
          uploader_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_access_requests_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          amount: number
          company_name: string | null
          contractor_type: string
          created_at: string
          email: string | null
          file_name: string
          file_path: string
          id: string
          phone_number: string | null
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          company_name?: string | null
          contractor_type: string
          created_at?: string
          email?: string | null
          file_name: string
          file_path: string
          id?: string
          phone_number?: string | null
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          company_name?: string | null
          contractor_type?: string
          created_at?: string
          email?: string | null
          file_name?: string
          file_path?: string
          id?: string
          phone_number?: string | null
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registered_emails: {
        Row: {
          city: string | null
          company_type: Database["public"]["Enums"]["CompanyType"]
          contractor_type: string
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          company_type: Database["public"]["Enums"]["CompanyType"]
          contractor_type: string
          created_at?: string
          email: string
          id?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          company_type?: Database["public"]["Enums"]["CompanyType"]
          contractor_type?: string
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      CompanyType: "Underentrepren├Âr" | "Totalentrepren├Âr" | "Best├ñllare"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      CompanyType: ["Underentrepren├Âr", "Totalentrepren├Âr", "Best├ñllare"],
    },
  },
} as const
