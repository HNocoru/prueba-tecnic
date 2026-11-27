
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
            "assistant_configs": {
                  Row: {
                    "escalation_message": string | null,"greeting": string | null,"language": string,"mascot": NonNullable<Json>,"name": string,"tenant_id": string,"tone": string | null,"updated_at": string,"voice": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "escalation_message"?: string | null,"greeting"?: string | null,"language"?: string,"mascot"?: NonNullable<Json>,"name"?: string,"tenant_id": string,"tone"?: string | null,"updated_at"?: string,"voice"?: string | null
                  }
                  Update: {
                    "escalation_message"?: string | null,"greeting"?: string | null,"language"?: string,"mascot"?: NonNullable<Json>,"name"?: string,"tenant_id"?: string,"tone"?: string | null,"updated_at"?: string,"voice"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "assistant_configs_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: true
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"business_hours": {
                  Row: {
                    "closes": string,"id": string,"opens": string,"tenant_id": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "closes": string,"id"?: string,"opens": string,"tenant_id": string,"weekday": number
                  }
                  Update: {
                    "closes"?: string,"id"?: string,"opens"?: string,"tenant_id"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_hours_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"business_profiles": {
                  Row: {
                    "address": string | null,"contact_phone": string | null,"description": string | null,"legal_name": string | null,"policies": string | null,"tenant_id": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"contact_phone"?: string | null,"description"?: string | null,"legal_name"?: string | null,"policies"?: string | null,"tenant_id": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"contact_phone"?: string | null,"description"?: string | null,"legal_name"?: string | null,"policies"?: string | null,"tenant_id"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_profiles_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: true
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"call_turns": {
                  Row: {
                    "call_id": string,"id": string,"position": number,"role": string,"tenant_id": string,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "call_id": string,"id"?: string,"position": number,"role": string,"tenant_id": string,"text": string
                  }
                  Update: {
                    "call_id"?: string,"id"?: string,"position"?: number,"role"?: string,"tenant_id"?: string,"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "call_turns_tenant_id_call_id_fkey"
      columns: ["tenant_id","call_id"]
isOneToOne: false
      referencedRelation: "calls"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "call_turns_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"calls": {
                  Row: {
                    "conversation_id": string,"duration_seconds": number | null,"ended_at": string | null,"id": string,"outcome": string | null,"started_at": string,"summary": string | null,"tenant_id": string,"wa_call_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id": string,"duration_seconds"?: number | null,"ended_at"?: string | null,"id"?: string,"outcome"?: string | null,"started_at"?: string,"summary"?: string | null,"tenant_id": string,"wa_call_id"?: string | null
                  }
                  Update: {
                    "conversation_id"?: string,"duration_seconds"?: number | null,"ended_at"?: string | null,"id"?: string,"outcome"?: string | null,"started_at"?: string,"summary"?: string | null,"tenant_id"?: string,"wa_call_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "calls_tenant_id_conversation_id_fkey"
      columns: ["tenant_id","conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "calls_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"catalog_items": {
                  Row: {
                    "active": boolean,"created_at": string,"currency": string,"description": string | null,"id": string,"kind": string,"name": string,"price": number | null,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"currency"?: string,"description"?: string | null,"id"?: string,"kind": string,"name": string,"price"?: number | null,"tenant_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"currency"?: string,"description"?: string | null,"id"?: string,"kind"?: string,"name"?: string,"price"?: number | null,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "catalog_items_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"contacts": {
                  Row: {
                    "attributes": NonNullable<Json>,"created_at": string,"id": string,"name": string | null,"phone_e164": string | null,"redacted_at": string | null,"tenant_id": string,"wa_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attributes"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"name"?: string | null,"phone_e164"?: string | null,"redacted_at"?: string | null,"tenant_id": string,"wa_id": string
                  }
                  Update: {
                    "attributes"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"name"?: string | null,"phone_e164"?: string | null,"redacted_at"?: string | null,"tenant_id"?: string,"wa_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contacts_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "contact_id": string,"id": string,"last_activity_at": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_id": string,"id"?: string,"last_activity_at"?: string,"tenant_id": string
                  }
                  Update: {
                    "contact_id"?: string,"id"?: string,"last_activity_at"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_tenant_id_contact_id_fkey"
      columns: ["tenant_id","contact_id"]
isOneToOne: true
      referencedRelation: "contacts"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "conversations_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"faqs": {
                  Row: {
                    "answer": string,"id": string,"position": number,"question": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"id"?: string,"position"?: number,"question": string,"tenant_id": string
                  }
                  Update: {
                    "answer"?: string,"id"?: string,"position"?: number,"question"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "faqs_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string | null,"conversation_id": string,"direction": string,"id": string,"kind": string,"media_path": string | null,"occurred_at": string,"tenant_id": string,"transcript": string | null,"wamid": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"conversation_id": string,"direction": string,"id"?: string,"kind": string,"media_path"?: string | null,"occurred_at"?: string,"tenant_id": string,"transcript"?: string | null,"wamid"?: string | null
                  }
                  Update: {
                    "body"?: string | null,"conversation_id"?: string,"direction"?: string,"id"?: string,"kind"?: string,"media_path"?: string | null,"occurred_at"?: string,"tenant_id"?: string,"transcript"?: string | null,"wamid"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_tenant_id_conversation_id_fkey"
      columns: ["tenant_id","conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "messages_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "age": number | null,"avatar_path": string | null,"full_name": string | null,"phone": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "age"?: number | null,"avatar_path"?: string | null,"full_name"?: string | null,"phone"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "age"?: number | null,"avatar_path"?: string | null,"full_name"?: string | null,"phone"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"requests": {
                  Row: {
                    "amount": number | null,"contact_id": string,"conversation_id": string | null,"created_at": string,"id": string,"source": string,"status": string,"tenant_id": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number | null,"contact_id": string,"conversation_id"?: string | null,"created_at"?: string,"id"?: string,"source"?: string,"status"?: string,"tenant_id": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number | null,"contact_id"?: string,"conversation_id"?: string | null,"created_at"?: string,"id"?: string,"source"?: string,"status"?: string,"tenant_id"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "requests_tenant_id_contact_id_fkey"
      columns: ["tenant_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "requests_tenant_conversation_fkey"
      columns: ["tenant_id","conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "requests_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenant_members": {
                  Row: {
                    "role": string,"tenant_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "role"?: string,"tenant_id": string,"user_id": string
                  }
                  Update: {
                    "role"?: string,"tenant_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_members_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenants": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"settings": NonNullable<Json>,"slug": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"settings"?: NonNullable<Json>,"slug": string,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"settings"?: NonNullable<Json>,"slug"?: string,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"webhook_events": {
                  Row: {
                    "error": string | null,"event_id": string,"id": string,"payload": NonNullable<Json>,"processed_at": string | null,"provider": string,"received_at": string,"tenant_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "error"?: string | null,"event_id": string,"id"?: string,"payload": NonNullable<Json>,"processed_at"?: string | null,"provider": string,"received_at"?: string,"tenant_id"?: string | null
                  }
                  Update: {
                    "error"?: string | null,"event_id"?: string,"id"?: string,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"provider"?: string,"received_at"?: string,"tenant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "webhook_events_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"whatsapp_numbers": {
                  Row: {
                    "created_at": string,"display_phone": string | null,"id": string,"phone_number_id": string,"status": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_phone"?: string | null,"id"?: string,"phone_number_id": string,"status"?: string,"tenant_id": string
                  }
                  Update: {
                    "created_at"?: string,"display_phone"?: string | null,"id"?: string,"phone_number_id"?: string,"status"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_numbers_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: true
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "current_tenant":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"jsonb_has_secrets":
{ Args: { "p": Json }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
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
            
          }
        }
} as const
