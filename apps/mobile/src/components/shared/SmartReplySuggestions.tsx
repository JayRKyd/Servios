import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'

interface SmartReplySuggestionsProps {
  suggestions: string[]
  onSelect: (text: string) => void
}

export function SmartReplySuggestions({ suggestions, onSelect }: SmartReplySuggestionsProps) {
  if (suggestions.length === 0) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.container}
      contentContainerStyle={s.content}
    >
      {suggestions.map((s) => (
        <TouchableOpacity key={s} style={chip} onPress={() => onSelect(s)} activeOpacity={0.7}>
          <Text style={chipText}>{s}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flexGrow: 0, marginBottom: 6 },
  content: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
})

// Inline style objects to avoid name collision with StyleSheet `s`
const chip: object = {
  backgroundColor: '#eff6ff',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#bfdbfe',
  paddingHorizontal: 12,
  paddingVertical: 6,
}

const chipText: object = {
  color: '#1a56db',
  fontSize: 13,
  fontWeight: '500' as const,
}
