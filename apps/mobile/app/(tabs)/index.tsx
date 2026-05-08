import { useRole } from '@/store/store'
import { CustomerHomeScreen } from '@/screens/customer/CustomerHomeScreen'
import { ProviderHomeScreen } from '@/screens/provider/ProviderHomeScreen'
import { LandlordHomeScreen } from '@/screens/landlord/LandlordHomeScreen'
import { TenantHomeScreen } from '@/screens/tenant/TenantHomeScreen'
import { View, Text } from 'react-native'

export default function HomeTab() {
  const { activeRole } = useRole()
  switch (activeRole) {
    case 'customer': return <CustomerHomeScreen />
    case 'provider': return <ProviderHomeScreen />
    case 'landlord': return <LandlordHomeScreen />
    case 'tenant': return <TenantHomeScreen />
    default: return <View><Text>Dashboard</Text></View>
  }
}
