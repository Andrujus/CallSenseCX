import { Call, Sentiment, Urgency } from '../types';

export const MOCK_USER = {
  id: 'u_123',
  name: 'Jane Doe',
  email: 'admin@acmecorp.com',
  company_id: 'c_acme',
  role: 'admin' as const,
};

export const MOCK_SETTINGS = {
  bot_greeting: "Hi, thanks for calling ACME support. How can I help you today?",
  enable_ai_classification: true,
  phone_number: "+1 (555) 019-2834"
};

const TRANSCRIPT_1 = `
Bot: Hi, thanks for calling ACME support. How can I help you today?
Customer: Hi, I'm trying to log into my account but it says my subscription is expired. I paid just yesterday.
Bot: I understand. You're having trouble accessing your account despite a recent payment. Let me check that for you. Can you please confirm your email address?
Customer: It's john.smith@example.com.
Bot: Thank you, John. One moment... I see the payment of $49.00 processed yesterday, but the system hasn't updated your license key. I can force a refresh right now.
Customer: That would be great, I have a presentation in an hour.
Bot: Done. Please try logging in again now.
Customer: Okay, hold on... Yes, it works now! Thank you so much.
Bot: You're very welcome. Is there anything else I can help with?
Customer: No, that's it. Bye.
`;

const TRANSCRIPT_2 = `
Bot: Hi, thanks for calling ACME support. How can I help you today?
Customer: Your software is completely broken! It crashed three times this morning and I lost data!
Bot: I am very sorry to hear that you've experienced crashes and data loss. That sounds incredibly frustrating. To help us fix this, were you performing a specific action when it crashed?
Customer: I was just trying to export the PDF report. This is unacceptable for a paid tool.
Bot: I completely agree, this needs to be resolved. I've flagged this as a high-priority bug for our engineering team. We will restore your last auto-save from our cloud backup. 
Customer: How long will that take?
Bot: It should appear in your dashboard within 15 minutes. I'll also issue a 1 month credit to your account for the trouble.
Customer: Fine. Just fix the PDF export.
Bot: We are on it. Thank you for your patience.
`;

const TRANSCRIPT_3 = `
Bot: Hi, thanks for calling ACME support. How can I help you today?
Customer: Hi, I was wondering if you offer an enterprise plan with SSO support?
Bot: Yes, we do offer Enterprise plans that include Single Sign-On via SAML and priority support. 
Customer: Great, do you have pricing for that on the website?
Bot: Enterprise pricing varies based on seat count. I can have a sales representative email you a quote today. What is the best email?
Customer: lisa@bigcorp.com. Also, do you support Okta?
Bot: Yes, we fully support Okta. I've added a note for the sales team. expect an email by end of day.
Customer: Perfect, thanks.
`;

export const INITIAL_CALLS: Call[] = [
  {
    id: 'call_101',
    company_id: 'c_acme',
    caller_number: '+1 (202) 555-0101',
    agent_name: 'AI Voice Bot',
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    duration_seconds: 145,
    status: 'completed',
    transcript: TRANSCRIPT_1,
    ai_data: {
      summary: "Customer reported account access issues after payment. Bot identified a sync delay, forced a license refresh, and resolved the issue immediately.",
      customer_intent: "Restore account access after payment",
      sentiment: Sentiment.POSITIVE,
      urgency: Urgency.MEDIUM,
      action_items: [],
      tags: ["billing", "technical", "resolved"]
    }
  },
  {
    id: 'call_102',
    company_id: 'c_acme',
    caller_number: '+1 (415) 555-9988',
    agent_name: 'AI Voice Bot',
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    duration_seconds: 210,
    status: 'completed',
    transcript: TRANSCRIPT_2,
    ai_data: {
      summary: "Customer angry about data loss during PDF export crashes. Bot apologized, flagged bug to engineering, initiated cloud backup restoration, and issued service credit.",
      customer_intent: "Report bug / Complain about instability",
      sentiment: Sentiment.NEGATIVE,
      urgency: Urgency.HIGH,
      action_items: [
        { owner: 'business', task: 'Investigate PDF export crash', deadline: 'ASAP' },
        { owner: 'business', task: 'Restore customer cloud backup', deadline: '15 mins' }
      ],
      tags: ["complaint", "bug_report", "retention_risk"]
    }
  },
  {
    id: 'call_103',
    company_id: 'c_acme',
    caller_number: '+1 (646) 555-1234',
    agent_name: 'AI Voice Bot',
    started_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    duration_seconds: 95,
    status: 'completed',
    transcript: TRANSCRIPT_3,
    ai_data: {
      summary: "Inquiry about Enterprise plans and SSO (Okta) support. Bot confirmed support and arranged for a sales quote to be emailed.",
      customer_intent: "Sales inquiry / SSO details",
      sentiment: Sentiment.NEUTRAL,
      urgency: Urgency.LOW,
      action_items: [
        { owner: 'business', task: 'Send enterprise quote to lisa@bigcorp.com', deadline: 'End of Day' }
      ],
      tags: ["sales", "feature_request"]
    }
  }
];
