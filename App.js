import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import { AppProvider } from './src/context/AppContext';
import DashboardScreen   from './src/screens/DashboardScreen';
import ConnectionScreen  from './src/screens/ConnectionScreen';
import AIScreen          from './src/screens/AIScreen';
import { DTCScreen }     from './src/screens/DTCScreen';
import CorrectionScreen  from './src/screens/CorrectionScreen';
import HealthReportScreen from './src/screens/HealthReportScreen';
import SettingsScreen    from './src/screens/SettingsScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const C = { bg:'#050810', surface:'#0a0e18', border:'#1a2535', accent:'#00c8ff', accent2:'#ff6020', muted:'#3d5570' };
const hdr = { backgroundColor:C.surface, borderBottomColor:C.border, borderBottomWidth:1 };
const hdrT = { fontFamily:'monospace', fontWeight:'700', fontSize:12, letterSpacing:2 };

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle:hdr, headerTintColor:C.accent, headerTitleStyle:hdrT }}>
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown:false }}/>
      <Stack.Screen name="HealthReport" component={HealthReportScreen} options={{ title:'RAPPORT SANTÉ COMPLET' }}/>
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerStyle: hdr, headerTintColor: C.accent, headerTitleStyle: hdrT,
      tabBarStyle: { backgroundColor:C.surface, borderTopColor:C.border, height:62 },
      tabBarActiveTintColor: C.accent, tabBarInactiveTintColor: C.muted,
      tabBarLabelStyle: { fontSize:9, fontWeight:'700', marginBottom:4 },
    }}>
      <Tab.Screen name="Dashboard"  component={DashboardScreen}  options={{ title:'TABLEAU', headerTitle:'i10 G4HG — DIAG PRO', tabBarIcon:({color})=><Text style={{color,fontSize:20}}>⚡</Text> }}/>
      <Tab.Screen name="Connection" component={ConnectionScreen} options={{ title:'CONNEXION', headerTitle:'CONNEXION ELM327',     tabBarIcon:({color})=><Text style={{color,fontSize:20}}>🔌</Text> }}/>
      <Tab.Screen name="AI"         component={AIScreen}         options={{ title:'IA DIAG',  headerTitle:'ANALYSE IA — G4HG',    tabBarIcon:({color})=><Text style={{color,fontSize:20}}>🤖</Text> }}/>
      <Tab.Screen name="DTC"        component={DTCScreen}        options={{ title:'DTC',      headerTitle:'CODES DÉFAUT',          tabBarIcon:({color})=><Text style={{color,fontSize:20}}>⚠️</Text> }}/>
      <Tab.Screen name="Correction" component={CorrectionScreen} options={{ title:'CORRECTION',headerTitle:'CORRECTION & RESET',   tabBarIcon:({color})=><Text style={{color,fontSize:20}}>🔧</Text> }}/>
      <Tab.Screen name="Settings"   component={SettingsScreen}   options={{ title:'RÉGLAGES', headerTitle:'RÉGLAGES & CLÉS API',   tabBarIcon:({color})=><Text style={{color,fontSize:20}}>⚙️</Text> }}/>
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={C.bg}/>
        <MainStack/>
      </NavigationContainer>
    </AppProvider>
  );
}
