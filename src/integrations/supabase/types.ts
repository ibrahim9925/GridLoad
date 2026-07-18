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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      about_sections: {
        Row: {
          body: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          section_key: string
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          section_key: string
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          section_key?: string
          title?: string | null
        }
        Relationships: []
      }
      auth_rate_limits: {
        Row: {
          attempts: number | null
          blocked_until: string | null
          created_at: string | null
          endpoint: string | null
          id: string
          identifier: string
          last_attempt: string | null
          window_start: string | null
        }
        Insert: {
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          endpoint?: string | null
          id?: string
          identifier: string
          last_attempt?: string | null
          window_start?: string | null
        }
        Update: {
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          endpoint?: string | null
          id?: string
          identifier?: string
          last_attempt?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      automation_executions: {
        Row: {
          error: string | null
          executed_at: string | null
          id: string
          result: Json | null
          rule_id: string | null
          status: string | null
        }
        Insert: {
          error?: string | null
          executed_at?: string | null
          id?: string
          result?: Json | null
          rule_id?: string | null
          status?: string | null
        }
        Update: {
          error?: string | null
          executed_at?: string | null
          id?: string
          result?: Json | null
          rule_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          name: string
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name: string
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name?: string
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          account_type: string | null
          bank_name: string | null
          branch: string | null
          created_at: string | null
          currency: string | null
          current_balance: number | null
          iban: string | null
          id: string
          is_active: boolean | null
          name: string | null
          opening_balance: number | null
          routing_number: string | null
          swift_code: string | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          branch?: string | null
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          opening_balance?: number | null
          routing_number?: string | null
          swift_code?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          branch?: string | null
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          opening_balance?: number | null
          routing_number?: string | null
          swift_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bank_ledger: {
        Row: {
          amount: number
          balance_after: number | null
          bank_account_id: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          date: string | null
          description: string | null
          document_url: string | null
          exchange_rate: number | null
          id: string
          linked_payment_id: string | null
          linked_sale_id: string | null
          nis_value: number | null
          notes: string | null
          purpose: string | null
          reconciled: boolean | null
          reconciled_at: string | null
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          transaction_type: string
          usd_value: number | null
        }
        Insert: {
          amount?: number
          balance_after?: number | null
          bank_account_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date?: string | null
          description?: string | null
          document_url?: string | null
          exchange_rate?: number | null
          id?: string
          linked_payment_id?: string | null
          linked_sale_id?: string | null
          nis_value?: number | null
          notes?: string | null
          purpose?: string | null
          reconciled?: boolean | null
          reconciled_at?: string | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          transaction_type: string
          usd_value?: number | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          bank_account_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date?: string | null
          description?: string | null
          document_url?: string | null
          exchange_rate?: number | null
          id?: string
          linked_payment_id?: string | null
          linked_sale_id?: string | null
          nis_value?: number | null
          notes?: string | null
          purpose?: string | null
          reconciled?: boolean | null
          reconciled_at?: string | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          transaction_type?: string
          usd_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_ledger_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_text: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      capital_injections: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          id: string
          injection_date: string | null
          investor_name: string | null
          reference_number: string | null
          source: string | null
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          injection_date?: string | null
          investor_name?: string | null
          reference_number?: string | null
          source?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          injection_date?: string | null
          investor_name?: string | null
          reference_number?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_injections_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_bundles: {
        Row: {
          closed_date: string | null
          created_at: string
          created_by: string | null
          currency: string
          deposit_batch_id: string | null
          id: string
          notes: string | null
          opened_date: string
          original_amount: number
          reference_number: string
          source_id: string | null
          source_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          closed_date?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deposit_batch_id?: string | null
          id?: string
          notes?: string | null
          opened_date?: string
          original_amount: number
          reference_number: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          closed_date?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deposit_batch_id?: string | null
          id?: string
          notes?: string | null
          opened_date?: string
          original_amount?: number
          reference_number?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      checks: {
        Row: {
          amount: number
          bounce_reason: string | null
          check_date: string | null
          check_number: string
          cleared_date: string | null
          cleared_to_bank_account_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          due_date: string
          id: string
          issuing_bank: string | null
          notes: string | null
          payment_id: string | null
          sale_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          bounce_reason?: string | null
          check_date?: string | null
          check_number: string
          cleared_date?: string | null
          cleared_to_bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          due_date: string
          id?: string
          issuing_bank?: string | null
          notes?: string | null
          payment_id?: string | null
          sale_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bounce_reason?: string | null
          check_date?: string | null
          check_number?: string
          cleared_date?: string | null
          cleared_to_bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          due_date?: string
          id?: string
          issuing_bank?: string | null
          notes?: string | null
          payment_id?: string | null
          sale_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checks_cleared_to_bank_account_id_fkey"
            columns: ["cleared_to_bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payments: {
        Row: {
          amount: number | null
          base_commission: number | null
          bonus_commission: number | null
          commission_rate: number | null
          created_at: string | null
          currency: string | null
          id: string
          notes: string | null
          paid_date: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          period_end: string | null
          period_start: string | null
          sale_id: string | null
          sales_rep_id: string | null
          staff_id: string | null
          status: string | null
          total_commission: number | null
          total_sales: number | null
        }
        Insert: {
          amount?: number | null
          base_commission?: number | null
          bonus_commission?: number | null
          commission_rate?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          sale_id?: string | null
          sales_rep_id?: string | null
          staff_id?: string | null
          status?: string | null
          total_commission?: number | null
          total_sales?: number | null
        }
        Update: {
          amount?: number | null
          base_commission?: number | null
          bonus_commission?: number | null
          commission_rate?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          sale_id?: string | null
          sales_rep_id?: string | null
          staff_id?: string | null
          status?: string | null
          total_commission?: number | null
          total_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_targets: {
        Row: {
          actual_commission: number | null
          actual_sales: number | null
          bonus_rate: number | null
          bonus_threshold: number | null
          commission_rate: number | null
          created_at: string | null
          id: string
          period_end: string | null
          period_start: string | null
          sales_rep_id: string | null
          staff_id: string | null
          status: string | null
          target_amount: number | null
          target_period_end: string | null
          target_period_start: string | null
          target_type: string | null
        }
        Insert: {
          actual_commission?: number | null
          actual_sales?: number | null
          bonus_rate?: number | null
          bonus_threshold?: number | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          sales_rep_id?: string | null
          staff_id?: string | null
          status?: string | null
          target_amount?: number | null
          target_period_end?: string | null
          target_period_start?: string | null
          target_type?: string | null
        }
        Update: {
          actual_commission?: number | null
          actual_sales?: number | null
          bonus_rate?: number | null
          bonus_threshold?: number | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          sales_rep_id?: string | null
          staff_id?: string | null
          status?: string | null
          target_amount?: number | null
          target_period_end?: string | null
          target_period_start?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_targets_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_targets_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      container_analytics: {
        Row: {
          calculated_at: string | null
          container_id: string | null
          delivery_variance_days: number | null
          id: string
          metric_type: string
          metric_value: Json | null
          on_time_delivery: boolean | null
          quality_score: number | null
          supplier_id: string | null
          total_transit_days: number | null
        }
        Insert: {
          calculated_at?: string | null
          container_id?: string | null
          delivery_variance_days?: number | null
          id?: string
          metric_type: string
          metric_value?: Json | null
          on_time_delivery?: boolean | null
          quality_score?: number | null
          supplier_id?: string | null
          total_transit_days?: number | null
        }
        Update: {
          calculated_at?: string | null
          container_id?: string | null
          delivery_variance_days?: number | null
          id?: string
          metric_type?: string
          metric_value?: Json | null
          on_time_delivery?: boolean | null
          quality_score?: number | null
          supplier_id?: string | null
          total_transit_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "container_analytics_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_analytics_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      container_products: {
        Row: {
          container_id: string
          created_at: string | null
          expected_quantity: number | null
          id: string
          notes: string | null
          product_id: string
          product_name: string | null
          received_quantity: number | null
          status: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          container_id: string
          created_at?: string | null
          expected_quantity?: number | null
          id?: string
          notes?: string | null
          product_id: string
          product_name?: string | null
          received_quantity?: number | null
          status?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          container_id?: string
          created_at?: string | null
          expected_quantity?: number | null
          id?: string
          notes?: string | null
          product_id?: string
          product_name?: string | null
          received_quantity?: number | null
          status?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "container_products_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      container_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          container_id: string
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          container_id: string
          id?: string
          notes?: string | null
          status: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          container_id?: string
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "container_status_history_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
        ]
      }
      container_variances: {
        Row: {
          actual_quantity: number | null
          container_id: string
          container_product_id: string | null
          created_at: string | null
          created_by: string | null
          expected_quantity: number | null
          id: string
          notes: string | null
          product_id: string | null
          received_quantity: number | null
          reported_at: string | null
          reported_by: string | null
          resolution: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          status: string | null
          unit_cost: number | null
          updated_at: string | null
          variance: number | null
          variance_quantity: number | null
          variance_type: string | null
          variance_value: number | null
        }
        Insert: {
          actual_quantity?: number | null
          container_id: string
          container_product_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_quantity?: number | null
          id?: string
          notes?: string | null
          product_id?: string | null
          received_quantity?: number | null
          reported_at?: string | null
          reported_by?: string | null
          resolution?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          variance?: number | null
          variance_quantity?: number | null
          variance_type?: string | null
          variance_value?: number | null
        }
        Update: {
          actual_quantity?: number | null
          container_id?: string
          container_product_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_quantity?: number | null
          id?: string
          notes?: string | null
          product_id?: string | null
          received_quantity?: number | null
          reported_at?: string | null
          reported_by?: string | null
          resolution?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          variance?: number | null
          variance_quantity?: number | null
          variance_type?: string | null
          variance_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "container_variances_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_variances_container_product_id_fkey"
            columns: ["container_product_id"]
            isOneToOne: false
            referencedRelation: "container_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_variances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      containers: {
        Row: {
          actual_arrival_date: string | null
          arrival_date: string | null
          clearance_cost: number | null
          container_number: string
          created_at: string | null
          currency: string | null
          customs_fees: number | null
          customs_status: string | null
          delivered_date: string | null
          destination_port: string | null
          estimated_delivery_date: string | null
          id: string
          insurance_value: number | null
          notes: string | null
          order_date: string | null
          origin_port: string | null
          shipping_date: string | null
          status: string | null
          supplier_id: string | null
          total_cost: number | null
          tracking_number: string | null
          transportation_cost: number | null
          updated_at: string | null
        }
        Insert: {
          actual_arrival_date?: string | null
          arrival_date?: string | null
          clearance_cost?: number | null
          container_number: string
          created_at?: string | null
          currency?: string | null
          customs_fees?: number | null
          customs_status?: string | null
          delivered_date?: string | null
          destination_port?: string | null
          estimated_delivery_date?: string | null
          id?: string
          insurance_value?: number | null
          notes?: string | null
          order_date?: string | null
          origin_port?: string | null
          shipping_date?: string | null
          status?: string | null
          supplier_id?: string | null
          total_cost?: number | null
          tracking_number?: string | null
          transportation_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_arrival_date?: string | null
          arrival_date?: string | null
          clearance_cost?: number | null
          container_number?: string
          created_at?: string | null
          currency?: string | null
          customs_fees?: number | null
          customs_status?: string | null
          delivered_date?: string | null
          destination_port?: string | null
          estimated_delivery_date?: string | null
          id?: string
          insurance_value?: number | null
          notes?: string | null
          order_date?: string | null
          origin_port?: string | null
          shipping_date?: string | null
          status?: string | null
          supplier_id?: string | null
          total_cost?: number | null
          tracking_number?: string | null
          transportation_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "containers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_rates: {
        Row: {
          created_at: string | null
          effective_date: string | null
          from_currency: string
          id: string
          rate: number
          to_currency: string
        }
        Insert: {
          created_at?: string | null
          effective_date?: string | null
          from_currency: string
          id?: string
          rate: number
          to_currency: string
        }
        Update: {
          created_at?: string | null
          effective_date?: string | null
          from_currency?: string
          id?: string
          rate?: number
          to_currency?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          area: string | null
          city: string | null
          company_name: string | null
          contact_person: string
          country: string | null
          created_at: string | null
          created_by: string | null
          credit_limit: number | null
          customer_type: string | null
          default_discount_percentage: number | null
          email: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          payment_terms: string | null
          payment_terms_days: number | null
          phone: string | null
          phone2: string | null
          postal_code: string | null
          preferred_currency: string | null
          preferred_payment_method: string | null
          state: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          city?: string | null
          company_name?: string | null
          contact_person: string
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          customer_type?: string | null
          default_discount_percentage?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payment_terms?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          phone2?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          preferred_payment_method?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          city?: string | null
          company_name?: string | null
          contact_person?: string
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          customer_type?: string | null
          default_discount_percentage?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payment_terms?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          phone2?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          preferred_payment_method?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_schedules: {
        Row: {
          address: string | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          delivery_time: string | null
          driver: string | null
          id: string
          notes: string | null
          sale_id: string | null
          scheduled_date: string | null
          signature_url: string | null
          status: string | null
          vehicle: string | null
        }
        Insert: {
          address?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_time?: string | null
          driver?: string | null
          id?: string
          notes?: string | null
          sale_id?: string | null
          scheduled_date?: string | null
          signature_url?: string | null
          status?: string | null
          vehicle?: string | null
        }
        Update: {
          address?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_time?: string | null
          driver?: string | null
          id?: string
          notes?: string | null
          sale_id?: string | null
          scheduled_date?: string | null
          signature_url?: string | null
          status?: string | null
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_schedules_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_schedules_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_batches: {
        Row: {
          bank_account_id: string | null
          batch_number: string | null
          cash_spent: number | null
          created_at: string | null
          created_by: string | null
          deposit_date: string | null
          deposit_reference: string | null
          deposited_amount: number | null
          end_date: string | null
          id: string
          items: Json | null
          notes: string | null
          remaining_to_deposit: number | null
          start_date: string | null
          status: string | null
          total_amount: number | null
          total_sales_amount: number | null
        }
        Insert: {
          bank_account_id?: string | null
          batch_number?: string | null
          cash_spent?: number | null
          created_at?: string | null
          created_by?: string | null
          deposit_date?: string | null
          deposit_reference?: string | null
          deposited_amount?: number | null
          end_date?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          remaining_to_deposit?: number | null
          start_date?: string | null
          status?: string | null
          total_amount?: number | null
          total_sales_amount?: number | null
        }
        Update: {
          bank_account_id?: string | null
          batch_number?: string | null
          cash_spent?: number | null
          created_at?: string | null
          created_by?: string | null
          deposit_date?: string | null
          deposit_reference?: string | null
          deposited_amount?: number | null
          end_date?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          remaining_to_deposit?: number | null
          start_date?: string | null
          status?: string | null
          total_amount?: number | null
          total_sales_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deposit_batches_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          approved_date: string | null
          cash_bundle_id: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          expense_date: string | null
          id: string
          invoice_number: string | null
          is_recurring: boolean | null
          notes: string | null
          purchase_order_id: string | null
          receipt_url: string | null
          shipment_id: string | null
          source_id: string | null
          source_type: string | null
          staff_id: string | null
          status: string | null
          supplier_id: string | null
          tax_amount: number | null
          vendor: string | null
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          approved_date?: string | null
          cash_bundle_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          invoice_number?: string | null
          is_recurring?: boolean | null
          notes?: string | null
          purchase_order_id?: string | null
          receipt_url?: string | null
          shipment_id?: string | null
          source_id?: string | null
          source_type?: string | null
          staff_id?: string | null
          status?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          approved_date?: string | null
          cash_bundle_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          invoice_number?: string | null
          is_recurring?: boolean | null
          notes?: string | null
          purchase_order_id?: string | null
          receipt_url?: string | null
          shipment_id?: string | null
          source_id?: string | null
          source_type?: string | null
          staff_id?: string | null
          status?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_cash_bundle_id_fkey"
            columns: ["cash_bundle_id"]
            isOneToOne: false
            referencedRelation: "cash_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "po_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          exchange_rate: number | null
          from_account_id: string
          from_amount: number
          from_currency: string
          from_nis: number | null
          fx_variance_nis: number | null
          id: string
          notes: string | null
          reference_number: string | null
          to_account_id: string
          to_amount: number
          to_currency: string
          to_nis: number | null
          transfer_date: string
          transfer_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exchange_rate?: number | null
          from_account_id: string
          from_amount: number
          from_currency: string
          from_nis?: number | null
          fx_variance_nis?: number | null
          id?: string
          notes?: string | null
          reference_number?: string | null
          to_account_id: string
          to_amount: number
          to_currency: string
          to_nis?: number | null
          transfer_date?: string
          transfer_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exchange_rate?: number | null
          from_account_id?: string
          from_amount?: number
          from_currency?: string
          from_nis?: number | null
          fx_variance_nis?: number | null
          id?: string
          notes?: string | null
          reference_number?: string | null
          to_account_id?: string
          to_amount?: number
          to_currency?: string
          to_nis?: number | null
          transfer_date?: string
          transfer_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fx_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fx_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_reports: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          installation_id: string
          photos: Json | null
          report_type: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          installation_id: string
          photos?: Json | null
          report_type?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          installation_id?: string
          photos?: Json | null
          report_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_reports_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_sale_items: {
        Row: {
          created_at: string | null
          id: string
          installation_id: string
          notes: string | null
          product_id: string | null
          quantity: number | null
          sale_item_id: string | null
          serial_number: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          installation_id: string
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          sale_item_id?: string | null
          serial_number?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          installation_id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          sale_item_id?: string | null
          serial_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_sale_items_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_sale_items_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      installations: {
        Row: {
          address: string | null
          checklist: Json | null
          completed_date: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          customer_id: string | null
          duration_hours: number | null
          feedback: string | null
          id: string
          installer_id: string | null
          notes: string | null
          photos: Json | null
          rating: number | null
          sale_id: string | null
          scheduled_date: string | null
          signature_url: string | null
          status: string | null
          type: string | null
          updated_at: string | null
          warranty_id: string | null
        }
        Insert: {
          address?: string | null
          checklist?: Json | null
          completed_date?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          customer_id?: string | null
          duration_hours?: number | null
          feedback?: string | null
          id?: string
          installer_id?: string | null
          notes?: string | null
          photos?: Json | null
          rating?: number | null
          sale_id?: string | null
          scheduled_date?: string | null
          signature_url?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          warranty_id?: string | null
        }
        Update: {
          address?: string | null
          checklist?: Json | null
          completed_date?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          customer_id?: string | null
          duration_hours?: number | null
          feedback?: string | null
          id?: string
          installer_id?: string | null
          notes?: string | null
          photos?: Json | null
          rating?: number | null
          sale_id?: string | null
          scheduled_date?: string | null
          signature_url?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_installer_id_fkey"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_valuations: {
        Row: {
          average_cost: number | null
          id: string
          last_purchase_price: number | null
          market_price: number | null
          method: string | null
          product_id: string | null
          quantity: number | null
          replacement_cost: number | null
          total_value: number | null
          unit_cost: number | null
          valuation_date: string | null
          valuation_method: string | null
        }
        Insert: {
          average_cost?: number | null
          id?: string
          last_purchase_price?: number | null
          market_price?: number | null
          method?: string | null
          product_id?: string | null
          quantity?: number | null
          replacement_cost?: number | null
          total_value?: number | null
          unit_cost?: number | null
          valuation_date?: string | null
          valuation_method?: string | null
        }
        Update: {
          average_cost?: number | null
          id?: string
          last_purchase_price?: number | null
          market_price?: number | null
          method?: string | null
          product_id?: string | null
          quantity?: number | null
          replacement_cost?: number | null
          total_value?: number | null
          unit_cost?: number | null
          valuation_date?: string | null
          valuation_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_valuations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          assigned_to: string | null
          budget: number | null
          calculator_data: Json | null
          company: string | null
          converted_to_customer_id: string | null
          created_at: string | null
          email: string | null
          id: string
          industry: string | null
          last_contact_date: string | null
          lead_type: string | null
          name: string
          next_follow_up: string | null
          notes: string | null
          phone: string | null
          priority: string | null
          probability: number | null
          source: string | null
          status: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          budget?: number | null
          calculator_data?: Json | null
          company?: string | null
          converted_to_customer_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          lead_type?: string | null
          name: string
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          probability?: number | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          budget?: number | null
          calculator_data?: Json | null
          company?: string | null
          converted_to_customer_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          lead_type?: string | null
          name?: string
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          probability?: number | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_to_customer_id_fkey"
            columns: ["converted_to_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_enrollment_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          secret: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          secret?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          secret?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          payload: Json | null
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_fulfillment: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          delivered_at: string | null
          fulfilled_at: string | null
          fulfilled_by: string | null
          fulfillment_status: string | null
          id: string
          notes: string | null
          priority: string | null
          sale_id: string | null
          shipped_at: string | null
          status: string | null
          tracking_number: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          delivered_at?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          fulfillment_status?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          sale_id?: string | null
          shipped_at?: string | null
          status?: string | null
          tracking_number?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          delivered_at?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          fulfillment_status?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          sale_id?: string | null
          shipped_at?: string | null
          status?: string | null
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_fulfillment_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_slips: {
        Row: {
          carrier: string | null
          created_at: string | null
          dimensions: string | null
          id: string
          items: Json | null
          notes: string | null
          sale_id: string | null
          slip_number: string | null
          status: string | null
          total_weight: number | null
          tracking_number: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string | null
          dimensions?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          sale_id?: string | null
          slip_number?: string | null
          status?: string | null
          total_weight?: number | null
          tracking_number?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string | null
          dimensions?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          sale_id?: string | null
          slip_number?: string | null
          status?: string | null
          total_weight?: number | null
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packing_slips_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedules: {
        Row: {
          amount: number | null
          created_at: string | null
          customer_id: string | null
          due_date: string | null
          id: string
          installment_number: number | null
          notes: string | null
          paid_date: string | null
          payment_id: string | null
          sale_id: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          installment_number?: number | null
          notes?: string | null
          paid_date?: string | null
          payment_id?: string | null
          sale_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          installment_number?: number | null
          notes?: string | null
          paid_date?: string | null
          payment_id?: string | null
          sale_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedules_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedules_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          amount_nis: number | null
          amount_usd: number | null
          bank_account_id: string | null
          contra_group_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          document_url: string | null
          exchange_rate: number | null
          exchange_rate_to_nis: number | null
          id: string
          method_details: Json | null
          nis_equivalent: number | null
          notes: string | null
          original_amount: number | null
          original_currency: string | null
          payment_date: string | null
          payment_method: string | null
          reference_number: string | null
          sale_id: string | null
          status: string | null
        }
        Insert: {
          amount?: number
          amount_nis?: number | null
          amount_usd?: number | null
          bank_account_id?: string | null
          contra_group_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          document_url?: string | null
          exchange_rate?: number | null
          exchange_rate_to_nis?: number | null
          id?: string
          method_details?: Json | null
          nis_equivalent?: number | null
          notes?: string | null
          original_amount?: number | null
          original_currency?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          sale_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          amount_nis?: number | null
          amount_usd?: number | null
          bank_account_id?: string | null
          contra_group_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          document_url?: string | null
          exchange_rate?: number | null
          exchange_rate_to_nis?: number | null
          id?: string
          method_details?: Json | null
          nis_equivalent?: number | null
          notes?: string | null
          original_amount?: number | null
          original_currency?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          sale_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      picking_lists: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          items: Json | null
          notes: string | null
          picking_number: string | null
          priority: string | null
          sale_id: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          picking_number?: string | null
          priority?: string | null
          sale_id?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          picking_number?: string | null
          priority?: string | null
          sale_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "picking_lists_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      po_payments_out: {
        Row: {
          amount: number
          bank_account_id: string | null
          cash_bundle_id: string | null
          contra_group_id: string | null
          cost_category: string
          cost_category_label: string | null
          created_at: string | null
          created_by: string | null
          document_url: string | null
          exchange_rate_to_nis: number
          id: string
          method_details: Json | null
          needs_reconciliation: boolean
          nis_equivalent: number
          notes: string | null
          original_currency: string
          payment_date: string | null
          payment_method: string
          payment_type: string | null
          purchase_order_id: string
          shipment_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          cash_bundle_id?: string | null
          contra_group_id?: string | null
          cost_category?: string
          cost_category_label?: string | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          exchange_rate_to_nis?: number
          id?: string
          method_details?: Json | null
          needs_reconciliation?: boolean
          nis_equivalent?: number
          notes?: string | null
          original_currency?: string
          payment_date?: string | null
          payment_method?: string
          payment_type?: string | null
          purchase_order_id: string
          shipment_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          cash_bundle_id?: string | null
          contra_group_id?: string | null
          cost_category?: string
          cost_category_label?: string | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          exchange_rate_to_nis?: number
          id?: string
          method_details?: Json | null
          needs_reconciliation?: boolean
          nis_equivalent?: number
          notes?: string | null
          original_currency?: string
          payment_date?: string | null
          payment_method?: string
          payment_type?: string | null
          purchase_order_id?: string
          shipment_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_payments_out_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_payments_out_cash_bundle_id_fkey"
            columns: ["cash_bundle_id"]
            isOneToOne: false
            referencedRelation: "cash_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_payments_out_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_payments_out_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "po_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      po_shipment_items: {
        Row: {
          condition: string | null
          created_at: string
          id: string
          product_id: string | null
          purchase_order_item_id: string | null
          quantity_ordered_snapshot: number
          quantity_received: number
          shipment_id: string
          variance: number | null
        }
        Insert: {
          condition?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          purchase_order_item_id?: string | null
          quantity_ordered_snapshot?: number
          quantity_received?: number
          shipment_id: string
          variance?: number | null
        }
        Update: {
          condition?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          purchase_order_item_id?: string | null
          quantity_ordered_snapshot?: number
          quantity_received?: number
          shipment_id?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "po_shipment_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_shipment_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "po_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      po_shipments: {
        Row: {
          actual_arrival_date: string | null
          clearance_estimate: number | null
          condition_notes: string | null
          created_at: string
          created_by: string | null
          expected_arrival_date: string | null
          freight_estimate: number | null
          has_variance: boolean | null
          id: string
          purchase_order_id: string
          shipment_date: string | null
          shipment_number: string | null
          shipping_method: string | null
          status: string
          tracking_number: string | null
          updated_at: string
          warehouse_arrival_date: string | null
        }
        Insert: {
          actual_arrival_date?: string | null
          clearance_estimate?: number | null
          condition_notes?: string | null
          created_at?: string
          created_by?: string | null
          expected_arrival_date?: string | null
          freight_estimate?: number | null
          has_variance?: boolean | null
          id?: string
          purchase_order_id: string
          shipment_date?: string | null
          shipment_number?: string | null
          shipping_method?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
          warehouse_arrival_date?: string | null
        }
        Update: {
          actual_arrival_date?: string | null
          clearance_estimate?: number | null
          condition_notes?: string | null
          created_at?: string
          created_by?: string | null
          expected_arrival_date?: string | null
          freight_estimate?: number | null
          has_variance?: boolean | null
          id?: string
          purchase_order_id?: string
          shipment_date?: string | null
          shipment_number?: string | null
          shipping_method?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
          warehouse_arrival_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_shipments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_serial_numbers: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          product_id: string
          received_date: string | null
          sale_id: string | null
          serial_number: string
          shipment_id: string | null
          sold_date: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          received_date?: string | null
          sale_id?: string | null
          serial_number: string
          shipment_id?: string | null
          sold_date?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          received_date?: string | null
          sale_id?: string | null
          serial_number?: string
          shipment_id?: string | null
          sold_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_serial_numbers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_serial_numbers_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_serial_numbers_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "po_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      product_suppliers: {
        Row: {
          cost_price: number | null
          created_at: string | null
          id: string
          is_preferred: boolean | null
          product_id: string
          supplier_id: string
          supplier_sku: string | null
        }
        Insert: {
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_preferred?: boolean | null
          product_id: string
          supplier_id: string
          supplier_sku?: string | null
        }
        Update: {
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_preferred?: boolean | null
          product_id?: string
          supplier_id?: string
          supplier_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          cost_price: number | null
          created_at: string | null
          current_stock: number
          datasheet_url: string | null
          description: string | null
          dimensions: string | null
          full_description: string | null
          id: string
          image_url: string | null
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          is_serialized: boolean
          landed_cost: number | null
          low_stock_threshold: number | null
          max_stock_level: number | null
          min_stock_level: number | null
          moq: number | null
          name: string
          product_type: Database["public"]["Enums"]["product_type_enum"] | null
          reorder_point: number
          requires_installation: boolean | null
          short_description: string | null
          sku: string | null
          slug: string | null
          specs: Json | null
          standard_selling_price: number | null
          status: string | null
          supplier: string | null
          supplier_id: string | null
          unit: string | null
          updated_at: string | null
          warranty_months: number | null
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number
          datasheet_url?: string | null
          description?: string | null
          dimensions?: string | null
          full_description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_serialized?: boolean
          landed_cost?: number | null
          low_stock_threshold?: number | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          moq?: number | null
          name: string
          product_type?: Database["public"]["Enums"]["product_type_enum"] | null
          reorder_point?: number
          requires_installation?: boolean | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          specs?: Json | null
          standard_selling_price?: number | null
          status?: string | null
          supplier?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string | null
          warranty_months?: number | null
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number
          datasheet_url?: string | null
          description?: string | null
          dimensions?: string | null
          full_description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_serialized?: boolean
          landed_cost?: number | null
          low_stock_threshold?: number | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          moq?: number | null
          name?: string
          product_type?: Database["public"]["Enums"]["product_type_enum"] | null
          reorder_point?: number
          requires_installation?: boolean | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          specs?: Json | null
          standard_selling_price?: number | null
          status?: string | null
          supplier?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string | null
          warranty_months?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          governorate: string | null
          id: string
          is_pro: boolean | null
          is_verified: boolean | null
          language_pref: string | null
          license_number: string | null
          onboarding_complete: boolean | null
          phone: string | null
          ps_account_type: Database["public"]["Enums"]["ps_account_type"] | null
          ps_role: Database["public"]["Enums"]["ps_user_role"] | null
          social_links: Json | null
          updated_at: string | null
          website: string | null
          years_in_business: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          governorate?: string | null
          id: string
          is_pro?: boolean | null
          is_verified?: boolean | null
          language_pref?: string | null
          license_number?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          ps_account_type?:
            | Database["public"]["Enums"]["ps_account_type"]
            | null
          ps_role?: Database["public"]["Enums"]["ps_user_role"] | null
          social_links?: Json | null
          updated_at?: string | null
          website?: string | null
          years_in_business?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          governorate?: string | null
          id?: string
          is_pro?: boolean | null
          is_verified?: boolean | null
          language_pref?: string | null
          license_number?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          ps_account_type?:
            | Database["public"]["Enums"]["ps_account_type"]
            | null
          ps_role?: Database["public"]["Enums"]["ps_user_role"] | null
          social_links?: Json | null
          updated_at?: string | null
          website?: string | null
          years_in_business?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          completion_date: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean
          is_featured: boolean | null
          location: string | null
          system_size_kwp: number | null
          title: string
        }
        Insert: {
          completion_date?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean | null
          location?: string | null
          system_size_kwp?: number | null
          title: string
        }
        Update: {
          completion_date?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean | null
          location?: string | null
          system_size_kwp?: number | null
          title?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          purchase_order_id: string
          quantity: number | null
          received_quantity: number | null
          status: string | null
          total: number | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          purchase_order_id: string
          quantity?: number | null
          received_quantity?: number | null
          status?: string | null
          total?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number | null
          received_quantity?: number | null
          status?: string | null
          total?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          container_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          discount_amount: number | null
          expected_delivery: string | null
          id: string
          notes: string | null
          order_date: string | null
          order_number: string | null
          origin_country: string | null
          payment_status: string | null
          payment_terms: string | null
          purchase_type: string
          received_date: string | null
          shipment_reference: string | null
          shipping_cost: number | null
          status: string | null
          supplier_id: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          container_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_amount?: number | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          origin_country?: string | null
          payment_status?: string | null
          payment_terms?: string | null
          purchase_type?: string
          received_date?: string | null
          shipment_reference?: string | null
          shipping_cost?: number | null
          status?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          container_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_amount?: number | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          origin_country?: string | null
          payment_status?: string | null
          payment_terms?: string | null
          purchase_type?: string
          received_date?: string | null
          shipment_reference?: string | null
          shipping_cost?: number | null
          status?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string | null
          description: string | null
          discount: number | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number | null
          quotation_id: string
          total: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          quotation_id: string
          total?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          quotation_id?: string
          total?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          converted_to_sale_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          discount_amount: number | null
          exchange_rate: number | null
          id: string
          net_amount: number | null
          notes: string | null
          quote_number: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          terms: string | null
          total_amount: number | null
          updated_at: string | null
          valid_until: string | null
          version: number
        }
        Insert: {
          converted_to_sale_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          exchange_rate?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          quote_number?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
          version?: number
        }
        Update: {
          converted_to_sale_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          exchange_rate?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          quote_number?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotations_converted_to_sale_id_fkey"
            columns: ["converted_to_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string | null
          product_interest: string | null
          status: string
        }
        Insert: {
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          product_interest?: string | null
          status?: string
        }
        Update: {
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          product_interest?: string | null
          status?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          attempts: number | null
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      receipts: {
        Row: {
          amount: number | null
          currency: string | null
          customer_id: string | null
          id: string
          issued_at: string | null
          notes: string | null
          payment_id: string | null
          receipt_number: string | null
          receipt_type: string | null
          sale_id: string | null
        }
        Insert: {
          amount?: number | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          payment_id?: string | null
          receipt_number?: string | null
          receipt_type?: string | null
          sale_id?: string | null
        }
        Update: {
          amount?: number | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          payment_id?: string | null
          receipt_number?: string | null
          receipt_type?: string | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          message: string
          scheduled_for: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          message: string
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          message?: string
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string | null
          discount: number | null
          has_missing_serials: boolean
          id: string
          notes: string | null
          product_id: string | null
          quantity: number | null
          sale_id: string
          serial_number: string | null
          total: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          discount?: number | null
          has_missing_serials?: boolean
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          sale_id: string
          serial_number?: string | null
          total?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          discount?: number | null
          has_missing_serials?: boolean
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          sale_id?: string
          serial_number?: string | null
          total?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_nis: number | null
          amount_usd: number | null
          balance_due: number | null
          commission_amount: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          deferred_due_date: string | null
          delivery_address: string | null
          delivery_charges: number
          delivery_company_name: string | null
          delivery_company_settled: boolean | null
          delivery_date: string | null
          discount_amount: number | null
          discount_percentage: number
          discount_type: string
          exchange_rate: number | null
          expected_payment_date: string | null
          fulfillment_status: string
          id: string
          installment_plan_type: string | null
          invoice_number: string | null
          is_installment: boolean
          net_amount: number | null
          notes: string | null
          payment_status: string | null
          payment_terms: string | null
          sale_date: string | null
          sale_number: string | null
          sales_rep_id: string | null
          shipping_cost: number | null
          status: string | null
          subtotal: number
          subtotal_before_discount: number
          tax_amount: number | null
          tax_rate: number
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          amount_nis?: number | null
          amount_usd?: number | null
          balance_due?: number | null
          commission_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          deferred_due_date?: string | null
          delivery_address?: string | null
          delivery_charges?: number
          delivery_company_name?: string | null
          delivery_company_settled?: boolean | null
          delivery_date?: string | null
          discount_amount?: number | null
          discount_percentage?: number
          discount_type?: string
          exchange_rate?: number | null
          expected_payment_date?: string | null
          fulfillment_status?: string
          id?: string
          installment_plan_type?: string | null
          invoice_number?: string | null
          is_installment?: boolean
          net_amount?: number | null
          notes?: string | null
          payment_status?: string | null
          payment_terms?: string | null
          sale_date?: string | null
          sale_number?: string | null
          sales_rep_id?: string | null
          shipping_cost?: number | null
          status?: string | null
          subtotal?: number
          subtotal_before_discount?: number
          tax_amount?: number | null
          tax_rate?: number
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_nis?: number | null
          amount_usd?: number | null
          balance_due?: number | null
          commission_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          deferred_due_date?: string | null
          delivery_address?: string | null
          delivery_charges?: number
          delivery_company_name?: string | null
          delivery_company_settled?: boolean | null
          delivery_date?: string | null
          discount_amount?: number | null
          discount_percentage?: number
          discount_type?: string
          exchange_rate?: number | null
          expected_payment_date?: string | null
          fulfillment_status?: string
          id?: string
          installment_plan_type?: string | null
          invoice_number?: string | null
          is_installment?: boolean
          net_amount?: number | null
          notes?: string | null
          payment_status?: string | null
          payment_terms?: string | null
          sale_date?: string | null
          sale_number?: string | null
          sales_rep_id?: string | null
          shipping_cost?: number | null
          status?: string | null
          subtotal?: number
          subtotal_before_discount?: number
          tax_amount?: number | null
          tax_rate?: number
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string | null
          details: Json | null
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          message: string | null
          metadata: Json | null
          resolved_at: string | null
          severity: string | null
          title: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string | null
          title?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string | null
          title?: string | null
        }
        Relationships: []
      }
      security_audit_logs: {
        Row: {
          action_type: string | null
          created_at: string | null
          details: Json | null
          event_type: string
          geolocation: string | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string | null
          risk_level: string | null
          severity: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string | null
          details?: Json | null
          event_type: string
          geolocation?: string | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          risk_level?: string | null
          severity?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string | null
          details?: Json | null
          event_type?: string
          geolocation?: string | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          risk_level?: string | null
          severity?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_incidents: {
        Row: {
          affected_resources: string | null
          affected_users: number | null
          assigned_to: string | null
          created_at: string | null
          description: string | null
          details: Json | null
          id: string
          incident_type: string
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          affected_resources?: string | null
          affected_users?: number | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          incident_type: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          affected_resources?: string | null
          affected_users?: number | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          incident_type?: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          position: string | null
          role: string | null
          salary: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          position?: string | null
          role?: string | null
          salary?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          position?: string | null
          role?: string | null
          salary?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stock_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          auto_reorder_suggested: boolean | null
          created_at: string | null
          current_quantity: number | null
          id: string
          is_acknowledged: boolean | null
          is_resolved: boolean | null
          last_order_date: string | null
          message: string | null
          product_id: string | null
          reorder_quantity: number | null
          resolved_at: string | null
          severity: string | null
          suggested_order_quantity: number | null
          supplier_id: string | null
          threshold_quantity: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          auto_reorder_suggested?: boolean | null
          created_at?: string | null
          current_quantity?: number | null
          id?: string
          is_acknowledged?: boolean | null
          is_resolved?: boolean | null
          last_order_date?: string | null
          message?: string | null
          product_id?: string | null
          reorder_quantity?: number | null
          resolved_at?: string | null
          severity?: string | null
          suggested_order_quantity?: number | null
          supplier_id?: string | null
          threshold_quantity?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          auto_reorder_suggested?: boolean | null
          created_at?: string | null
          current_quantity?: number | null
          id?: string
          is_acknowledged?: boolean | null
          is_resolved?: boolean | null
          last_order_date?: string | null
          message?: string | null
          product_id?: string | null
          reorder_quantity?: number | null
          resolved_at?: string | null
          severity?: string | null
          suggested_order_quantity?: number | null
          supplier_id?: string | null
          threshold_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_number: string | null
          created_at: string | null
          created_by: string | null
          id: string
          location: string | null
          movement_type: string
          new_stock: number | null
          notes: string | null
          previous_stock: number | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          staff_id: string | null
          total_value: number | null
          unit_cost: number | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location?: string | null
          movement_type: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          staff_id?: string | null
          total_value?: number | null
          unit_cost?: number | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location?: string | null
          movement_type?: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          staff_id?: string | null
          total_value?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_warranty_claims: {
        Row: {
          claim_date: string
          created_at: string
          created_by: string | null
          credit_amount_nis: number | null
          fault_description: string
          fault_id: string | null
          id: string
          po_reference: string | null
          product_id: string | null
          purchase_date: string | null
          purchase_order_id: string | null
          replacement_serial_number: string | null
          resolution_type: string | null
          resolved_date: string | null
          serial_number: string | null
          status: string
          supplier_id: string | null
          supplier_response: string | null
          updated_at: string
          warranty_id: string | null
        }
        Insert: {
          claim_date?: string
          created_at?: string
          created_by?: string | null
          credit_amount_nis?: number | null
          fault_description: string
          fault_id?: string | null
          id?: string
          po_reference?: string | null
          product_id?: string | null
          purchase_date?: string | null
          purchase_order_id?: string | null
          replacement_serial_number?: string | null
          resolution_type?: string | null
          resolved_date?: string | null
          serial_number?: string | null
          status?: string
          supplier_id?: string | null
          supplier_response?: string | null
          updated_at?: string
          warranty_id?: string | null
        }
        Update: {
          claim_date?: string
          created_at?: string
          created_by?: string | null
          credit_amount_nis?: number | null
          fault_description?: string
          fault_id?: string | null
          id?: string
          po_reference?: string | null
          product_id?: string | null
          purchase_date?: string | null
          purchase_order_id?: string | null
          replacement_serial_number?: string | null
          resolution_type?: string | null
          resolved_date?: string | null
          serial_number?: string | null
          status?: string
          supplier_id?: string | null
          supplier_response?: string | null
          updated_at?: string
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_warranty_claims_fault_id_fkey"
            columns: ["fault_id"]
            isOneToOne: false
            referencedRelation: "warranty_fault_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_warranty_claims_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_warranty_claims_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_warranty_claims_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_warranty_claims_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          country: string | null
          created_at: string | null
          delivery_rating: number | null
          email: string | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          min_order_amount: number | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          quality_rating: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          delivery_rating?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          min_order_amount?: number | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          quality_rating?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          delivery_rating?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          min_order_amount?: number | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          quality_rating?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      test_executions: {
        Row: {
          completed_at: string | null
          executed_by: string | null
          id: string
          results: Json | null
          started_at: string | null
          status: string | null
          test_suite: string | null
        }
        Insert: {
          completed_at?: string | null
          executed_by?: string | null
          id?: string
          results?: Json | null
          started_at?: string | null
          status?: string | null
          test_suite?: string | null
        }
        Update: {
          completed_at?: string | null
          executed_by?: string | null
          id?: string
          results?: Json | null
          started_at?: string | null
          status?: string | null
          test_suite?: string | null
        }
        Relationships: []
      }
      test_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_value: number | null
          recorded_at: string | null
          tags: Json | null
        }
        Insert: {
          id?: string
          metric_name: string
          metric_value?: number | null
          recorded_at?: string | null
          tags?: Json | null
        }
        Update: {
          id?: string
          metric_name?: string
          metric_value?: number | null
          recorded_at?: string | null
          tags?: Json | null
        }
        Relationships: []
      }
      test_results: {
        Row: {
          created_at: string | null
          details: Json | null
          duration_ms: number | null
          execution_id: string | null
          id: string
          status: string | null
          test_name: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          execution_id?: string | null
          id?: string
          status?: string | null
          test_name: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          execution_id?: string | null
          id?: string
          status?: string | null
          test_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "test_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mfa_settings: {
        Row: {
          backup_codes: Json | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          totp_secret: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          totp_secret?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          totp_secret?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_active: string | null
          last_activity: string | null
          session_token: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active?: string | null
          last_activity?: string | null
          session_token?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active?: string | null
          last_activity?: string | null
          session_token?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      warranties: {
        Row: {
          coverage_details: string | null
          created_at: string | null
          customer_id: string | null
          end_date: string | null
          expiry_date: string | null
          id: string
          installation_date: string | null
          notes: string | null
          product_id: string | null
          product_serial_number_id: string | null
          purchase_date: string | null
          sale_id: string | null
          serial_number: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          warranty_end_date: string | null
          warranty_period_months: number | null
          warranty_start_date: string | null
          warranty_type: string | null
        }
        Insert: {
          coverage_details?: string | null
          created_at?: string | null
          customer_id?: string | null
          end_date?: string | null
          expiry_date?: string | null
          id?: string
          installation_date?: string | null
          notes?: string | null
          product_id?: string | null
          product_serial_number_id?: string | null
          purchase_date?: string | null
          sale_id?: string | null
          serial_number?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          warranty_end_date?: string | null
          warranty_period_months?: number | null
          warranty_start_date?: string | null
          warranty_type?: string | null
        }
        Update: {
          coverage_details?: string | null
          created_at?: string | null
          customer_id?: string | null
          end_date?: string | null
          expiry_date?: string | null
          id?: string
          installation_date?: string | null
          notes?: string | null
          product_id?: string | null
          product_serial_number_id?: string | null
          purchase_date?: string | null
          sale_id?: string | null
          serial_number?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          warranty_end_date?: string | null
          warranty_period_months?: number | null
          warranty_start_date?: string | null
          warranty_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_product_serial_number_id_fkey"
            columns: ["product_serial_number_id"]
            isOneToOne: false
            referencedRelation: "product_serial_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          assigned_to: string | null
          claim_date: string | null
          cost: number | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          id: string
          priority: string | null
          resolution: string | null
          resolved_at: string | null
          status: string | null
          warranty_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          claim_date?: string | null
          cost?: number | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          resolution?: string | null
          resolved_at?: string | null
          status?: string | null
          warranty_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          claim_date?: string | null
          cost?: number | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          resolution?: string | null
          resolved_at?: string | null
          status?: string | null
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_fault_log: {
        Row: {
          customer_id: string | null
          fault_date: string | null
          fault_description: string
          id: string
          loan_expected_return_date: string | null
          loan_given_date: string | null
          loan_returned_date: string | null
          loan_serial_id: string | null
          loan_status: string | null
          logged_at: string | null
          logged_by: string | null
          new_warranty_id: string | null
          product_serial_number_id: string | null
          repair_cost_nis: number | null
          repair_currency: string | null
          repair_expense_id: string | null
          repair_notes: string | null
          repair_paid_date: string | null
          repair_workshop: string | null
          replacement_serial_id: string | null
          resolution_type: string | null
          resolved_at: string | null
          sale_id: string | null
          warranty_id: string | null
        }
        Insert: {
          customer_id?: string | null
          fault_date?: string | null
          fault_description: string
          id?: string
          loan_expected_return_date?: string | null
          loan_given_date?: string | null
          loan_returned_date?: string | null
          loan_serial_id?: string | null
          loan_status?: string | null
          logged_at?: string | null
          logged_by?: string | null
          new_warranty_id?: string | null
          product_serial_number_id?: string | null
          repair_cost_nis?: number | null
          repair_currency?: string | null
          repair_expense_id?: string | null
          repair_notes?: string | null
          repair_paid_date?: string | null
          repair_workshop?: string | null
          replacement_serial_id?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          sale_id?: string | null
          warranty_id?: string | null
        }
        Update: {
          customer_id?: string | null
          fault_date?: string | null
          fault_description?: string
          id?: string
          loan_expected_return_date?: string | null
          loan_given_date?: string | null
          loan_returned_date?: string | null
          loan_serial_id?: string | null
          loan_status?: string | null
          logged_at?: string | null
          logged_by?: string | null
          new_warranty_id?: string | null
          product_serial_number_id?: string | null
          repair_cost_nis?: number | null
          repair_currency?: string | null
          repair_expense_id?: string | null
          repair_notes?: string | null
          repair_paid_date?: string | null
          repair_workshop?: string | null
          replacement_serial_id?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          sale_id?: string | null
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_fault_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_fault_log_product_serial_number_id_fkey"
            columns: ["product_serial_number_id"]
            isOneToOne: false
            referencedRelation: "product_serial_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_fault_log_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_fault_log_loan_serial_id_fkey"
            columns: ["loan_serial_id"]
            isOneToOne: false
            referencedRelation: "product_serial_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_fault_log_new_warranty_id_fkey"
            columns: ["new_warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_fault_log_repair_expense_id_fkey"
            columns: ["repair_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_fault_log_replacement_serial_id_fkey"
            columns: ["replacement_serial_id"]
            isOneToOne: false
            referencedRelation: "product_serial_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_fault_log_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_public_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      bounce_check: {
        Args: { p_check_id: string; p_reason: string }
        Returns: Json
      }
      bulk_delete_test_accounts: {
        Args: { p_email_pattern?: string }
        Returns: number
      }
      calculate_abc_analysis: {
        Args: never
        Returns: {
          abc_category: string
          cumulative_percentage: number
          product_id: string
          product_name: string
          revenue_percentage: number
          total_revenue: number
        }[]
      }
      calculate_fx_amounts: {
        Args: { p_amount: number; p_currency: string; p_exchange_rate?: number }
        Returns: Json
      }
      calculate_reorder_point: {
        Args: { p_product_id: string }
        Returns: number
      }
      can_access_financial_data: { Args: never; Returns: boolean }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      clear_check: {
        Args: {
          p_bank_account_id: string
          p_check_id: string
          p_cleared_date?: string
        }
        Returns: Json
      }
      confirm_warehouse_arrival: {
        Args: { p_items: Json; p_notes?: string; p_shipment_id: string }
        Returns: Json
      }
      convert_quotation_to_invoice: {
        Args: { p_quotation_id: string }
        Returns: string
      }
      create_contra_entry: {
        Args: {
          p_amount_nis: number
          p_customer_id: string
          p_notes?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      create_security_incident: {
        Args: {
          p_description: string
          p_details?: Json
          p_severity: string
          p_type: string
        }
        Returns: string
      }
      debug_auth_comprehensive: { Args: never; Returns: Json }
      debug_auth_status: { Args: never; Returns: Json }
      deposit_cash_bundle: {
        Args: {
          p_bank_account_id: string
          p_bundle_id: string
          p_deposit_reference?: string
          p_deposited_amount: number
          p_variance_reason?: string
        }
        Returns: string
      }
      execute_automation_rule: { Args: { p_rule_id: string }; Returns: Json }
      find_supplier_for_customer: {
        Args: { p_customer_id: string }
        Returns: {
          match_field: string
          supplier_id: string
          supplier_name: string
        }[]
      }
      force_close_po: {
        Args: { p_po_id: string; p_reason?: string }
        Returns: Json
      }
      generate_backup_codes: { Args: { p_user_id: string }; Returns: Json }
      generate_bundle_reference: { Args: never; Returns: string }
      generate_po_number: { Args: never; Returns: string }
      generate_quote_number: { Args: never; Returns: string }
      generate_sale_number: { Args: never; Returns: string }
      generate_shipment_number: { Args: never; Returns: string }
      generate_stock_alerts: { Args: never; Returns: undefined }
      generate_totp_secret: { Args: never; Returns: string }
      get_active_shipments: {
        Args: never
        Returns: {
          expected_arrival_date: string
          po_id: string
          po_number: string
          shipment_date: string
          shipment_id: string
          shipment_number: string
          status: string
          supplier_name: string
          tracking_number: string
        }[]
      }
      get_bank_position: { Args: never; Returns: Json }
      get_banking_capital_summary: { Args: never; Returns: Json }
      get_bundle_remaining: { Args: { p_bundle_id: string }; Returns: number }
      get_cash_flow_analysis: { Args: never; Returns: Json }
      get_cash_summary: { Args: never; Returns: Json }
      get_contra_balance: {
        Args: { p_customer_id: string; p_supplier_id: string }
        Returns: Json
      }
      get_current_user_role: { Args: never; Returns: string }
      get_customer_balance: { Args: { p_customer_id: string }; Returns: Json }
      get_customer_ledger: {
        Args: { p_customer_id: string }
        Returns: {
          credit_nis: number
          debit_nis: number
          entry_date: string
          entry_id: string
          entry_type: string
          original_amount: number
          original_currency: string
          reference: string
          running_balance_nis: number
        }[]
      }
      get_dashboard_summary: { Args: never; Returns: Json }
      get_enhanced_supplier_performance: {
        Args: never
        Returns: {
          on_time_rate: number
          quality_score: number
          supplier_id: string
          supplier_name: string
          total_orders: number
        }[]
      }
      get_exchange_rate: {
        Args: {
          p_date?: string
          p_from_currency: string
          p_to_currency: string
        }
        Returns: number
      }
      get_intelligent_reorder_recommendations: {
        Args: never
        Returns: {
          current_stock: number
          product_id: string
          product_name: string
          reorder_point: number
          suggested_quantity: number
        }[]
      }
      get_open_cash_bundles: {
        Args: never
        Returns: {
          currency: string
          id: string
          opened_date: string
          original_amount: number
          reference_number: string
          remaining: number
          source_id: string
          source_type: string
          status: string
        }[]
      }
      get_overdue_invoices: {
        Args: never
        Returns: {
          customer_id: string
          customer_name: string
          customer_phone: string
          days_overdue: number
          due_date: string
          invoice_date: string
          invoice_number: string
          original_amount_nis: number
          outstanding_nis: number
          paid_amount_nis: number
          payment_terms_days: number
          sale_id: string
        }[]
      }
      get_overdue_summary: { Args: never; Returns: Json }
      get_pending_checks: {
        Args: never
        Returns: {
          amount: number
          check_date: string
          check_number: string
          currency: string
          customer_id: string
          customer_name: string
          days_until_due: number
          due_date: string
          id: string
          issuing_bank: string
          sale_id: string
          sale_number: string
        }[]
      }
      get_pending_checks_summary: { Args: never; Returns: Json }
      get_pending_quotations: {
        Args: never
        Returns: {
          currency: string
          customer_name: string
          days_until_expiry: number
          id: string
          quote_number: string
          status: string
          total_amount: number
          valid_until: string
        }[]
      }
      get_pending_reconciliation: {
        Args: never
        Returns: {
          amount: number
          currency: string
          id: string
          nis_equivalent: number
          payment_date: string
          payment_method: string
          po_number: string
          purchase_order_id: string
          reference_number: string
          supplier_id: string
          supplier_name: string
        }[]
      }
      get_po_status: { Args: { p_po_id: string }; Returns: Json }
      get_real_injected_capital: { Args: never; Returns: number }
      get_seasonal_demand_intelligence: { Args: never; Returns: Json }
      get_stock_coverage_analysis: {
        Args: never
        Returns: {
          avg_daily_sales: number
          current_stock: number
          days_of_coverage: number
          name: string
          product_id: string
        }[]
      }
      get_supplier_balance: { Args: { p_supplier_id: string }; Returns: Json }
      get_supplier_intelligence: { Args: never; Returns: Json }
      get_supply_chain_cash_status: { Args: never; Returns: Json }
      get_system_health_status: { Args: never; Returns: Json }
      has_any_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_accountant: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      is_installer: { Args: never; Returns: boolean }
      is_sales_rep: { Args: never; Returns: boolean }
      is_warehouse: { Args: never; Returns: boolean }
      log_security_event: {
        Args: { p_details?: Json; p_event_type: string }
        Returns: undefined
      }
      mark_expired_quotations: { Args: never; Returns: undefined }
      preview_bulk_allocation: {
        Args: { p_amount_nis: number; p_customer_id: string }
        Returns: Json
      }
      process_container_arrival: {
        Args: { p_container_id: string }
        Returns: Json
      }
      recompute_bank_account_balance: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      record_bulk_customer_payment: {
        Args: {
          p_amount_nis: number
          p_bank_account_id?: string
          p_customer_id: string
          p_notes?: string
          p_payment_date?: string
          p_payment_method: string
          p_reference?: string
        }
        Returns: Json
      }
      record_internal_transfer: {
        Args: {
          p_exchange_rate?: number
          p_from_account: string
          p_from_amount: number
          p_notes?: string
          p_reference?: string
          p_to_account: string
        }
        Returns: string
      }
      refresh_bundle_status: {
        Args: { p_bundle_id: string }
        Returns: undefined
      }
      register_shipment_serials: {
        Args: { p_items: Json; p_shipment_id: string }
        Returns: Json
      }
      sale_nis_amount: {
        Args: {
          p_amount_nis: number
          p_currency: string
          p_date: string
          p_total: number
        }
        Returns: number
      }
      spend_from_bundle: {
        Args: {
          p_amount: number
          p_bundle_id: string
          p_category?: string
          p_description?: string
          p_vendor?: string
        }
        Returns: string
      }
      validate_backup_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
      validate_test_infrastructure: { Args: never; Returns: Json }
      validate_totp_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
      warranty_confirm_loan_return: {
        Args: { p_fault_id: string }
        Returns: Json
      }
      warranty_log_loan: {
        Args: {
          p_expected_return_date: string
          p_fault_id: string
          p_loan_serial_id: string
        }
        Returns: Json
      }
      warranty_log_replacement: {
        Args: { p_fault_id: string; p_new_serial_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "sales_rep"
        | "accountant"
        | "warehouse"
        | "installer"
      product_type_enum:
        | "inverter"
        | "panel"
        | "battery"
        | "breaker"
        | "wire"
        | "structure"
        | "accessory"
        | "other"
      ps_account_type: "individual" | "company"
      ps_company_member_role: "admin" | "editor" | "viewer"
      ps_contact_pref: "whatsapp" | "in_app" | "phone"
      ps_listing_category:
        | "inverters"
        | "solar_panels"
        | "batteries"
        | "mounting"
        | "cables_accessories"
        | "complete_systems"
        | "other"
      ps_listing_condition: "new" | "used" | "refurbished"
      ps_listing_status: "active" | "paused" | "sold" | "draft"
      ps_media_kind: "image" | "video"
      ps_post_type: "project" | "knowledge" | "market" | "question"
      ps_shipping_option: "pickup" | "local_delivery" | "nationwide"
      ps_user_role: "wholesaler" | "engineer" | "end_user"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "sales_rep",
        "accountant",
        "warehouse",
        "installer",
      ],
      product_type_enum: [
        "inverter",
        "panel",
        "battery",
        "breaker",
        "wire",
        "structure",
        "accessory",
        "other",
      ],
      ps_account_type: ["individual", "company"],
      ps_company_member_role: ["admin", "editor", "viewer"],
      ps_contact_pref: ["whatsapp", "in_app", "phone"],
      ps_listing_category: [
        "inverters",
        "solar_panels",
        "batteries",
        "mounting",
        "cables_accessories",
        "complete_systems",
        "other",
      ],
      ps_listing_condition: ["new", "used", "refurbished"],
      ps_listing_status: ["active", "paused", "sold", "draft"],
      ps_media_kind: ["image", "video"],
      ps_post_type: ["project", "knowledge", "market", "question"],
      ps_shipping_option: ["pickup", "local_delivery", "nationwide"],
      ps_user_role: ["wholesaler", "engineer", "end_user"],
    },
  },
} as const
