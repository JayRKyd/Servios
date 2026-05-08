import { useMemo } from 'react'
import { generateSuggestions, SmartReplyContext } from '@/lib/smartReplies'

export function useSmartReplies(context: SmartReplyContext | null): string[] {
  return useMemo(() => {
    if (!context?.lastMessage?.trim()) return []
    return generateSuggestions(context)
  }, [context?.lastMessage, context?.bookingStatus])
}
