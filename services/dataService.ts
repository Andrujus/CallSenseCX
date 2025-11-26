import { Call, CompanySettings, CallSummary, Sentiment, Urgency } from '../types';
import { INITIAL_CALLS, MOCK_SETTINGS } from './mockData';

// Simulating a database in memory
let calls: Call[] = [...INITIAL_CALLS];
let settings: CompanySettings = { ...MOCK_SETTINGS };

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const dataService = {
  getCalls: async (): Promise<Call[]> => {
    await delay(600); // Simulate network latency
    return [...calls].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  },

  getCallById: async (id: string): Promise<Call | undefined> => {
    await delay(300);
    return calls.find(c => c.id === id);
  },

  getSettings: async (): Promise<CompanySettings> => {
    await delay(300);
    return { ...settings };
  },

  updateSettings: async (newSettings: Partial<CompanySettings>): Promise<CompanySettings> => {
    await delay(500);
    settings = { ...settings, ...newSettings };
    return settings;
  },

  // Simulate an incoming call webhook triggering the AI flow
  simulateIncomingCall: async (): Promise<Call> => {
    const id = `call_${Date.now()}`;
    const newCall: Call = {
      id,
      company_id: 'c_acme',
      caller_number: `+1 (${Math.floor(Math.random() * 899) + 100}) 555-${Math.floor(Math.random() * 8999) + 1000}`,
      agent_name: 'AI Voice Bot',
      started_at: new Date().toISOString(),
      duration_seconds: 0,
      status: 'processing',
      transcript: 'System: Initializing call...\nBot: Hi, thanks for calling ACME support. How can I help you today?\nCustomer: [Speaking...]',
    };

    calls.unshift(newCall);
    
    // Simulate background processing (transcription + summarization)
    setTimeout(() => {
      const updatedCall = calls.find(c => c.id === id);
      if (updatedCall) {
        updatedCall.status = 'completed';
        updatedCall.duration_seconds = Math.floor(Math.random() * 300) + 60;
        updatedCall.transcript = updatedCall.transcript + `\nCustomer: I need help with my password.\nBot: I can help with that... [Call continues]\nBot: All set. Have a good day.`;
        updatedCall.ai_data = {
          summary: "Customer requested a password reset. Identity verified via SMS code. Reset link sent successfully.",
          customer_intent: "Password Reset",
          sentiment: Sentiment.NEUTRAL,
          urgency: Urgency.LOW,
          action_items: [],
          tags: ["support", "security"]
        };
      }
    }, 5000); // After 5 seconds, the "AI" finishes

    return newCall;
  }
};
