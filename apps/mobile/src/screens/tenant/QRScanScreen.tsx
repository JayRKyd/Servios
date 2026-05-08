import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/store'

export function QRScanScreen() {
  const { user } = useAuth()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!permission?.granted) requestPermission()
  }, [])

  async function handleBarcodeScan({ data }: { data: string }) {
    if (scanned || processing) return
    setScanned(true)

    // Expect URL like: .../tenant/join?property=<uuid>
    let propertyId: string | null = null
    try {
      const url = new URL(data)
      propertyId = url.searchParams.get('property')
    } catch {
      Alert.alert('Invalid QR Code', 'This QR code is not a valid Servios property code.', [
        { text: 'Try Again', onPress: () => setScanned(false) },
      ])
      return
    }

    if (!propertyId) {
      Alert.alert('Invalid QR Code', 'No property found in this code.', [
        { text: 'Try Again', onPress: () => setScanned(false) },
      ])
      return
    }

    setProcessing(true)
    try {
      // Fetch property details
      const { data: property, error } = await supabase
        .from('properties')
        .select('id, name, address, property_type')
        .eq('id', propertyId)
        .single()

      if (error || !property) throw new Error('Property not found')

      Alert.alert(
        '🏠 Join Property',
        `Link your account to "${property.name}"?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => { setScanned(false); setProcessing(false) } },
          {
            text: 'Join',
            onPress: async () => {
              try {
                const { error: updateErr } = await supabase
                  .from('tenant_profiles')
                  .update({ property_id: propertyId })
                  .eq('user_id', user?.id)

                if (updateErr) throw updateErr

                Alert.alert('✓ Linked!', `You are now linked to ${property.name}.`, [
                  { text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)') },
                ])
              } catch (e) {
                Alert.alert('Error', e instanceof Error ? e.message : 'Failed to link property')
                setScanned(false)
              } finally {
                setProcessing(false)
              }
            },
          },
        ],
      )
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to look up property', [
        { text: 'Try Again', onPress: () => { setScanned(false); setProcessing(false) } },
      ])
    }
  }

  if (!permission) return <ActivityIndicator style={{ flex: 1 }} color="#1a56db" />

  if (!permission.granted) {
    return (
      <View style={s.container}>
        <Text style={s.title}>Camera Permission Required</Text>
        <Text style={s.sub}>Please allow camera access to scan property QR codes.</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.backLink} onPress={() => router.back()}>
          <Text style={s.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={s.cameraContainer}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
      />

      {/* Overlay */}
      <View style={s.overlay}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <View style={s.centerArea}>
          <View style={s.scanFrame}>
            <View style={[s.corner, s.cornerTL]} />
            <View style={[s.corner, s.cornerTR]} />
            <View style={[s.corner, s.cornerBL]} />
            <View style={[s.corner, s.cornerBR]} />
          </View>
          {processing
            ? <ActivityIndicator color="#fff" size="large" style={{ marginTop: 20 }} />
            : <Text style={s.scanHint}>Point at a property QR code</Text>
          }
        </View>
      </View>
    </View>
  )
}

export default QRScanScreen

const CORNER = 24
const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60, alignItems: 'center', justifyContent: 'center', gap: 14 },
  title:          { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  sub:            { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  btn:            { backgroundColor: '#1a56db', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 13 },
  btnText:        { color: '#fff', fontSize: 15, fontWeight: '600' },
  backLink:       { marginTop: 4 },
  backLinkText:   { color: '#1a56db', fontSize: 14 },
  cameraContainer:{ flex: 1, backgroundColor: '#000' },
  overlay:        { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', paddingTop: 56, paddingBottom: 40 },
  backBtn:        { marginHorizontal: 20, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  backBtnText:    { color: '#fff', fontSize: 15, fontWeight: '600' },
  centerArea:     { alignItems: 'center' },
  scanFrame:      { width: 220, height: 220, position: 'relative' },
  corner:         { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff', borderWidth: 3 },
  cornerTL:       { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR:       { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL:       { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR:       { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanHint:       { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 20, textAlign: 'center' },
})
