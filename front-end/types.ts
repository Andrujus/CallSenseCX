export enum Sentiment {
  VERY_POSITIVE = 'very_positive',
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  VERY_NEGATIVE = 'very_negative',
}

export enum Urgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface ActionItem {
  owner: 'business' | 'customer' | 'unknown';
  task: string;
  deadline: string | null;
}

export interface CallSummary {
  summary: string;
  customer_intent: string;
  sentiment: Sentiment;
  urgency: Urgency;
  action_items: ActionItem[];
  tags: string[];
}

export interface Call {
  id: string;
  company_id: string;
  caller_number: string;
  agent_name?: string; // If handled by human, otherwise 'AI Voice Bot'
  started_at: string; // ISO Date
  duration_seconds: number;
  status: 'processing' | 'completed';
  transcript: string;
  ai_data?: CallSummary;
}

export interface User {
  id: string;
  name: string;
  email: string;
  company_id: string;
  role: 'admin' | 'agent';
}

export interface CompanySettings {
  bot_greeting: string;
  enable_ai_classification: boolean;
  phone_number: string;
}
