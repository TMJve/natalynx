
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"approvals": {
                  Row: {
                    "client_comment": string | null,"created_at": string,"description": string | null,"id": string,"image_path": string | null,"project_id": string,"responded_at": string | null,"responded_by": string | null,"stage_id": string | null,"status": Database["public"]['Enums']["approval_status"],"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_comment"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"image_path"?: string | null,"project_id": string,"responded_at"?: string | null,"responded_by"?: string | null,"stage_id"?: string | null,"status"?: Database["public"]['Enums']["approval_status"],"title": string
                  }
                  Update: {
                    "client_comment"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"image_path"?: string | null,"project_id"?: string,"responded_at"?: string | null,"responded_by"?: string | null,"stage_id"?: string | null,"status"?: Database["public"]['Enums']["approval_status"],"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "approvals_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approvals_stage_id_project_id_fkey"
      columns: ["stage_id","project_id"]
isOneToOne: false
      referencedRelation: "stages"
      referencedColumns: ["id","project_id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "company": string | null,"created_at": string,"email": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company"?: string | null,"created_at"?: string,"email": string,"id": string,"name": string
                  }
                  Update: {
                    "company"?: string | null,"created_at"?: string,"email"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"files": {
                  Row: {
                    "created_at": string,"id": string,"label": string,"mime_type": string | null,"project_id": string,"size_bytes": number | null,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"label": string,"mime_type"?: string | null,"project_id": string,"size_bytes"?: number | null,"storage_path": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"label"?: string,"mime_type"?: string | null,"project_id"?: string,"size_bytes"?: number | null,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "files_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_cents": number,"due_date": string | null,"id": string,"kind": Database["public"]['Enums']["payment_kind"],"paid_at": string | null,"project_id": string,"stage_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents"?: number,"due_date"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["payment_kind"],"paid_at"?: string | null,"project_id": string,"stage_id": string,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"due_date"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["payment_kind"],"paid_at"?: string | null,"project_id"?: string,"stage_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_stage_id_project_id_fkey"
      columns: ["stage_id","project_id"]
isOneToOne: false
      referencedRelation: "stages"
      referencedColumns: ["id","project_id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "client_id": string,"created_at": string,"currency": string,"id": string,"name": string,"revision_rounds_allowed": number,"summary": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"currency"?: string,"id"?: string,"name": string,"revision_rounds_allowed"?: number,"summary"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"currency"?: string,"id"?: string,"name"?: string,"revision_rounds_allowed"?: number,"summary"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"stages": {
                  Row: {
                    "completed_at": string | null,"due_date": string | null,"id": string,"name": string,"note": string | null,"position": number,"project_id": string,"status": Database["public"]['Enums']["stage_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"due_date"?: string | null,"id"?: string,"name": string,"note"?: string | null,"position": number,"project_id": string,"status"?: Database["public"]['Enums']["stage_status"],"updated_at"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"due_date"?: string | null,"id"?: string,"name"?: string,"note"?: string | null,"position"?: number,"project_id"?: string,"status"?: Database["public"]['Enums']["stage_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stages_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"updates": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"image_path": string | null,"project_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"image_path"?: string | null,"project_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"image_path"?: string | null,"project_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "updates_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_client_project":
{ Args: { "p_client_id": string,"p_client_name": string,"p_company": string,"p_currency": string,"p_deposit_cents": number,"p_email": string,"p_final_cents": number,"p_project_name": string,"p_revision_rounds": number,"p_summary": string }; Returns: string
                           },
"respond_to_approval":
{ Args: { "p_approval_id": string,"p_comment"?: string,"p_decision": Database["public"]['Enums']["approval_status"] }; Returns: {
              "client_comment": string | null,
"created_at": string,
"description": string | null,
"id": string,
"image_path": string | null,
"project_id": string,
"responded_at": string | null,
"responded_by": string | null,
"stage_id": string | null,
"status": Database["public"]['Enums']["approval_status"],
"title": string
            }
                          SetofOptions: {
        from: "*"
        to: "approvals"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "approval_status": "pending"|"approved"|"changes_requested","payment_kind": "deposit"|"final","stage_status": "not_started"|"in_progress"|"waiting_on_client"|"done"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "approval_status": ["pending", "approved", "changes_requested"],"payment_kind": ["deposit", "final"],"stage_status": ["not_started", "in_progress", "waiting_on_client", "done"]
          }
        }
} as const
