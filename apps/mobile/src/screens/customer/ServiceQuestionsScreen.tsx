import { useState } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ScrollView, SafeAreaView, StatusBar,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { CATEGORY_META, SERVICE_QUESTIONS, LOCATION_STEP } from '@/lib/service-questions'
import type { QuestionStep, QuestionOption } from '@/lib/service-questions'

// ─── Location search step ──────────────────────────────────────────────────

function LocationSearch({
  stepIndex,
  totalSteps,
  onSelect,
  onBack,
}: {
  stepIndex: number
  totalSteps: number
  onSelect: (value: string) => void
  onBack: () => void
}) {
  const [query, setQuery] = useState('')
  const filtered = query.trim()
    ? LOCATION_STEP.options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : []

  const progress = (stepIndex + 1) / totalSteps

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled" bounces={false}>

        {/* Back + location badge */}
        <View style={s.topRow}>
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={[s.catBadge, { backgroundColor: '#f3f4f6' }]}>
            <Text style={s.catBadgeText}>📍 Location</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={s.progressLabel}>Step {stepIndex + 1} of {totalSteps}</Text>

        {/* Question */}
        <Text style={s.question}>{LOCATION_STEP.question}</Text>
        <Text style={s.hint}>{LOCATION_STEP.hint}</Text>

        {/* Search input */}
        <View style={s.searchBox}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            autoFocus
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search for an island…"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Results */}
        {filtered.length > 0 ? (
          <View style={s.resultsList}>
            {filtered.map((opt, i) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => onSelect(opt.value)}
                activeOpacity={0.7}
                style={[s.resultRow, i < filtered.length - 1 && s.resultRowBorder]}
              >
                <Text style={s.resultPin}>📍</Text>
                <Text style={s.resultLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : query.trim() ? (
          <Text style={s.noResults}>No locations found</Text>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Radio row (single-select) ─────────────────────────────────────────────

function RadioRow({
  opt, selected, otherText, onSelect, onOtherChange,
}: {
  opt: QuestionOption
  selected: boolean
  otherText: string
  onSelect: () => void
  onOtherChange: (v: string) => void
}) {
  return (
    <View>
      <TouchableOpacity
        onPress={onSelect}
        activeOpacity={0.7}
        style={[s.optRow, selected && s.optRowSelected]}
      >
        <View style={[s.radio, selected && s.radioSelected]}>
          {selected && <View style={s.radioDot} />}
        </View>
        <Text style={[s.optLabel, selected && s.optLabelSelected]}>{opt.label}</Text>
      </TouchableOpacity>

      {selected && opt.allowText && (
        <TextInput
          autoFocus
          style={s.otherInput}
          value={otherText}
          onChangeText={onOtherChange}
          placeholder="Please describe…"
          placeholderTextColor="#9ca3af"
        />
      )}
    </View>
  )
}

// ─── Checkbox row (multi-select) ───────────────────────────────────────────

function CheckboxRow({
  opt, checked, otherText, onToggle, onOtherChange,
}: {
  opt: QuestionOption
  checked: boolean
  otherText: string
  onToggle: () => void
  onOtherChange: (v: string) => void
}) {
  return (
    <View>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        style={[s.optRow, checked && s.optRowSelected]}
      >
        <View style={[s.checkbox, checked && s.checkboxSelected]}>
          {checked && <Text style={s.checkMark}>✓</Text>}
        </View>
        <Text style={[s.optLabel, checked && s.optLabelSelected]}>{opt.label}</Text>
      </TouchableOpacity>

      {checked && opt.allowText && (
        <TextInput
          autoFocus
          style={s.otherInput}
          value={otherText}
          onChangeText={onOtherChange}
          placeholder="Please describe…"
          placeholderTextColor="#9ca3af"
        />
      )}
    </View>
  )
}

// ─── Main screen ───────────────────────────────────────────────────────────

export function ServiceQuestionsScreen() {
  const params = useLocalSearchParams<{ category: string }>()
  const category = params.category ?? ''

  const meta = CATEGORY_META[category]
  const categoryQuestions: QuestionStep[] = SERVICE_QUESTIONS[category] ?? []
  const totalSteps = categoryQuestions.length + 1  // +1 for location

  const [stepIndex, setStepIndex]   = useState(0)
  const [singles, setSingles]       = useState<Record<string, string>>({})
  const [multis, setMultis]         = useState<Record<string, string[]>>({})
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({})

  const isLocationStep = stepIndex === categoryQuestions.length
  const step = categoryQuestions[stepIndex]

  // ── helpers

  function getOtherText(qId: string, optVal: string) {
    return otherTexts[`${qId}.${optVal}`] ?? ''
  }

  function setOtherText(qId: string, optVal: string, text: string) {
    setOtherTexts(prev => ({ ...prev, [`${qId}.${optVal}`]: text }))
  }

  function buildContextAndNavigate(
    finalSingles: Record<string, string>,
    finalMultis: Record<string, string[]>,
    island: string,
  ) {
    const categoryLabel = meta?.label ?? category
    const contextParts: string[] = []
    for (const [id, val] of Object.entries(finalSingles)) contextParts.push(`${id}:${val}`)
    for (const [id, vals] of Object.entries(finalMultis)) {
      if (vals.length > 0) contextParts.push(`${id}:${vals.join('|')}`)
    }

    let url = `/(tabs)/search?category=${encodeURIComponent(categoryLabel)}`
    if (island) url += `&island=${encodeURIComponent(island)}`
    if (contextParts.length > 0) url += `&context=${encodeURIComponent(contextParts.join(','))}`

    router.push(url as any)
  }

  // ── single-select

  function handleSingleSelect(optValue: string) {
    const opt = step?.options.find(o => o.value === optValue)
    setSingles(prev => ({ ...prev, [step!.id]: optValue }))
    if (opt?.allowText) return  // wait for Continue
    setStepIndex(i => i + 1)
  }

  // ── multi-select toggle

  function handleMultiToggle(optValue: string) {
    setMultis(prev => {
      const cur = prev[step!.id] ?? []
      const next = cur.includes(optValue) ? cur.filter(v => v !== optValue) : [...cur, optValue]
      return { ...prev, [step!.id]: next }
    })
  }

  // ── continue (multi + allowText singles)

  function handleContinue() {
    if (!step) return
    const isMulti = step.type === 'multi'
    let newSingles = { ...singles }
    let newMultis  = { ...multis }

    if (isMulti) {
      const vals = multis[step.id] ?? []
      newMultis = {
        ...multis,
        [step.id]: vals.map(v => {
          const opt = step.options.find(o => o.value === v)
          if (opt?.allowText) return getOtherText(step.id, v).trim() || v
          return v
        }),
      }
    } else {
      const raw = singles[step.id] ?? ''
      const opt = step.options.find(o => o.value === raw)
      if (opt?.allowText) {
        newSingles = { ...singles, [step.id]: getOtherText(step.id, raw).trim() || raw }
      }
    }

    setSingles(newSingles)
    setMultis(newMultis)
    setStepIndex(i => i + 1)
  }

  function handleBack() {
    if (stepIndex > 0) {
      setStepIndex(i => i - 1)
    } else {
      router.back()
    }
  }

  // ── location step

  if (isLocationStep) {
    return (
      <LocationSearch
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        onSelect={island => buildContextAndNavigate(singles, multis, island)}
        onBack={handleBack}
      />
    )
  }

  if (!step) return null

  const isMulti = step.type === 'multi'
  const currentSingle = singles[step.id] ?? ''
  const currentMulti  = multis[step.id] ?? []
  const canContinue   = isMulti ? currentMulti.length > 0 : !!currentSingle
  const showContinue  = isMulti || !!(currentSingle && step.options.find(o => o.value === currentSingle)?.allowText)

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={s.inner}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Back + category badge */}
        <View style={s.topRow}>
          <TouchableOpacity onPress={handleBack} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          {meta && (
            <View style={[s.catBadge, { backgroundColor: meta.color }]}>
              <Text style={s.catBadgeText}>{meta.icon} {meta.label}</Text>
            </View>
          )}
        </View>

        {/* Progress */}
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${((stepIndex + 1) / totalSteps) * 100}%` as any }]} />
        </View>
        <Text style={s.progressLabel}>Step {stepIndex + 1} of {totalSteps}</Text>

        {/* Question */}
        <Text style={s.question}>{step.question}</Text>
        {step.hint && <Text style={s.hint}>{step.hint}</Text>}

        {/* Options */}
        <View style={s.options}>
          {isMulti
            ? step.options.map(opt => (
                <CheckboxRow
                  key={opt.value}
                  opt={opt}
                  checked={currentMulti.includes(opt.value)}
                  otherText={getOtherText(step.id, opt.value)}
                  onToggle={() => handleMultiToggle(opt.value)}
                  onOtherChange={v => setOtherText(step.id, opt.value, v)}
                />
              ))
            : step.options.map(opt => (
                <RadioRow
                  key={opt.value}
                  opt={opt}
                  selected={currentSingle === opt.value}
                  otherText={getOtherText(step.id, opt.value)}
                  onSelect={() => handleSingleSelect(opt.value)}
                  onOtherChange={v => setOtherText(step.id, opt.value, v)}
                />
              ))
          }
        </View>

        {/* Continue button */}
        {showContinue && (
          <TouchableOpacity
            style={[s.continueBtn, !canContinue && s.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!canContinue}
            activeOpacity={0.8}
          >
            <Text style={[s.continueBtnText, !canContinue && { color: '#9ca3af' }]}>
              Continue →
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

export default ServiceQuestionsScreen

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 20, paddingTop: 16 },

  topRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn:      { paddingVertical: 4 },
  backText:     { fontSize: 15, color: '#1a56db', fontWeight: '500' },
  catBadge:     { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  catBadgeText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  progressTrack: { height: 4, borderRadius: 4, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  progressFill:  { height: 4, borderRadius: 4, backgroundColor: '#1a56db' },
  progressLabel: { fontSize: 12, color: '#9ca3af', marginTop: 6, marginBottom: 20 },

  question: { fontSize: 22, fontWeight: '700', color: '#111827', lineHeight: 30, marginBottom: 6 },
  hint:     { fontSize: 13, color: '#6b7280', marginBottom: 18 },

  // Location search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 2,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 12,
  },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 12 },

  resultsList: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  resultRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  resultPin:   { fontSize: 16 },
  resultLabel: { fontSize: 15, fontWeight: '500', color: '#111827' },
  noResults:   { textAlign: 'center', fontSize: 14, color: '#9ca3af', marginTop: 20 },

  // Options
  options: { gap: 8, marginTop: 4 },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  optRowSelected:   { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  optLabel:         { flex: 1, fontSize: 15, fontWeight: '500', color: '#374151' },
  optLabelSelected: { color: '#1a56db', fontWeight: '600' },

  radio:         { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#1a56db', backgroundColor: '#1a56db' },
  radioDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  checkbox:         { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: '#1a56db', backgroundColor: '#1a56db' },
  checkMark:        { fontSize: 11, color: '#fff', fontWeight: '700' },

  otherInput: {
    marginTop: 8,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },

  continueBtn:         { marginTop: 24, backgroundColor: '#1a56db', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  continueBtnDisabled: { backgroundColor: '#f3f4f6' },
  continueBtnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },
})
