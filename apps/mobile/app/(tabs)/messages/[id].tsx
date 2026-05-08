import { useLocalSearchParams } from 'expo-router'
import { ChatScreen } from '@/screens/shared/ChatScreen'
export default function ChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ChatScreen conversationId={id} />
}
