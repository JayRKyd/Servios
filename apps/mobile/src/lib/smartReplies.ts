/**
 * Smart reply suggestion engine — shared logic (mobile).
 * Mirrors apps/web/src/lib/smartReplies.ts.
 *
 * Phase 2: replace generateSuggestions body with a fetch to the API
 * to get AI-generated suggestions. Hook interface stays identical.
 */

export interface SmartReplyContext {
  lastMessage: string
  bookingStatus?: string
  senderRole?: string
}

type SuggestionRule = {
  keywords: RegExp
  suggestions: string[]
}

const RULES: SuggestionRule[] = [
  { keywords: /\b(hello|hi|hey|good morning|good afternoon)\b/i, suggestions: ['Hi! How can I help?', 'Hello! Thanks for reaching out.', 'Hi there!'] },
  { keywords: /\b(done|finished|complete|completed|all done|job done)\b/i, suggestions: ['Thanks for letting me know!', "Great work, I'll release payment shortly.", "Noted, I'll review and confirm."] },
  { keywords: /\b(on my way|heading over|en route|be there|arriving)\b/i, suggestions: ["Great, I'll be ready!", 'Perfect, the door is unlocked.', 'Thanks for the heads up.'] },
  { keywords: /\b(running late|delayed|stuck|traffic|sorry for)\b/i, suggestions: ['No worries, take your time.', 'Thanks for letting me know!', "Okay, I'll adjust accordingly."] },
  { keywords: /\b(quote|price|cost|estimate|charge|fee)\b/i, suggestions: ['That price works for me.', 'Can you break down the costs?', "Thanks for the estimate, I'll review it."] },
  { keywords: /\b(schedule|reschedule|time|date|available|when)\b/i, suggestions: ['That time works for me.', 'Can we do a different day?', "I'll confirm the time shortly."] },
  { keywords: /\b(payment|invoice|paid|transfer|deposit)\b/i, suggestions: ['Payment has been sent.', "I'll process payment now.", 'Can you send an invoice?'] },
  { keywords: /\b(photo|picture|before|after|pic)\b/i, suggestions: ['Thanks, I can see the photos!', 'Looks great!', 'The work looks excellent.'] },
  { keywords: /\b(accept|confirmed|booked|secured)\b/i, suggestions: ['Great, see you then!', "Confirmed, I'll be ready.", 'Thanks for confirming!'] },
  { keywords: /\b(cancel|reject|decline|unable|not available)\b/i, suggestions: ['Understood, thank you.', "No problem, I'll find another provider.", 'Thanks for letting me know.'] },
  { keywords: /\?$/, suggestions: ["Yes, that's correct.", 'Let me check and get back to you.', 'Could you give me more details?'] },
  { keywords: /\b(thank you|thanks|appreciate)\b/i, suggestions: ["You're welcome!", 'Happy to help!', 'My pleasure!'] },
]

const STATUS_SUGGESTIONS: Record<string, string[]> = {
  pending: ['Still reviewing your request.', "I'll confirm shortly.", 'Just checking availability.'],
  accepted: ['Looking forward to it!', 'See you at the scheduled time.', "I'll be ready!"],
  in_progress: ['Work is going smoothly.', 'Almost done!', 'Any specific requests before I finish?'],
  completed: ['Thanks for the great work!', "I'll release payment now.", 'Will leave a review shortly.'],
}

export function generateSuggestions({ lastMessage, bookingStatus }: SmartReplyContext): string[] {
  const matched: string[] = []
  for (const rule of RULES) {
    if (rule.keywords.test(lastMessage)) {
      matched.push(...rule.suggestions)
      if (matched.length >= 4) break
    }
  }
  if (bookingStatus && STATUS_SUGGESTIONS[bookingStatus] && matched.length < 3) {
    matched.push(...STATUS_SUGGESTIONS[bookingStatus])
  }
  const unique = Array.from(new Set(matched))
  if (unique.length >= 2) return unique.slice(0, 3)
  return ['Thanks!', 'Got it.', "I'll follow up shortly."]
}
