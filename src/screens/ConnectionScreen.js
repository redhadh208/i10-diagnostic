import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useApp } from '../context/AppContext';
import BluetoothService from '../services/BluetoothService';
import OBDService from '../services/OBDService';

const C = { bg:'#050810',surface:'#0a0e18',panel:'#0f1520',border:'#1a2535',accent:'#00c8ff',accent2:'#ff6020',green:'#00ff88',yellow:'#ffc800',red:'#ff2050',text:'#b8d0e8',muted:'#3d5570' };

export default function ConnectionScreen() {
  const { state, actions } = useApp();
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const [devices, setDevices] = useState([]);
  const [manual, setManual] = useState('');

  const scan = async () => {
    setScanning(true); setDevices([]);
    try {
      await BluetoothService.initialize();
      const found = await BluetoothService.scanDevices();
      setDevices(found);
      if (!found.length) Alert.alert('Aucun appareil','Vérifiez:\n• ELM327 branché\n• Contact ON\n• Bluetooth activé\n• Appareil appairé dans Paramètres Android');
    } catch(e) { Alert.alert('Erreur', e.message); }
    setScanning(false);
  };

  const connectTo = async (device) => {
    setConnecting(device.address);
    try {
      await OBDService.connect(device.address);
      actions.setConnection(true, device);
      const vin = await OBDService.readVIN();
      if (vin) actions.setEcuInfo({ vin });
      Alert.alert('✅ Connecté', `${device.name||'ELM327'} — Lecture en cours`);
    } catch(e) { Alert.alert('❌ Échec', e.message+'\n\nFermez les autres apps OBD2 (Torque, Car Scanner...)'); }
    setConnecting(null);
  };

  const disconnect = async () => {
    Alert.alert('Déconnecter ?','',[{text:'Annuler',style:'cancel'},{text:'Oui',style:'destructive',onPress:async()=>{
      await OBDService.disconnect();
      actions.setConnection(false, null);
    }}]);
  };

  return (
    <ScrollView style={{flex:1,backgroundColor:C.bg}}>
      {/* Statut */}
      <View style={cn.statusCard}>
        <View style={[cn.dot,{backgroundColor:state.isConnected?C.green:C.muted}]}/>
        <View style={{flex:1}}>
          <Text style={cn.statusTxt}>{state.isConnected?'Connecté':'Déconnecté'}</Text>
          {state.isConnected&&state.connectedDevice&&(
            <Text style={cn.deviceTxt}>{state.connectedDevice.name||'ELM327'} · {state.connectedDevice.address}</Text>
          )}
          {state.ecuInfo?.vin&&<Text style={cn.deviceTxt}>VIN: {state.ecuInfo.vin}</Text>}
        </View>
        {state.isConnected&&(
          <TouchableOpacity style={cn.discBtn} onPress={disconnect}>
            <Text style={{color:C.red,fontSize:12,fontWeight:'700'}}>DÉCONNECTER</Text>
          </TouchableOpacity>
        )}
      </View>

      {!state.isConnected&&(
        <View style={{margin:12,marginTop:0}}>
          <TouchableOpacity style={cn.scanBtn} onPress={scan} disabled={scanning}>
            {scanning?<ActivityIndicator color={C.accent}/>:<Text style={cn.scanTxt}>🔍 RECHERCHER ELM327 BLUETOOTH</Text>}
          </TouchableOpacity>

          {devices.map(d=>(
            <TouchableOpacity key={d.address} style={cn.device} onPress={()=>connectTo(d)} disabled={!!connecting}>
              <View style={{flex:1}}>
                <Text style={cn.dName}>{d.name||'Appareil inconnu'}</Text>
                <Text style={cn.dAddr}>{d.address}</Text>
              </View>
              {connecting===d.address?<ActivityIndicator color={C.accent} size="small"/>:<Text style={{color:C.accent,fontSize:20}}>→</Text>}
            </TouchableOpacity>
          ))}

          <View style={cn.manualSection}>
            <Text style={{color:C.muted,fontSize:12,marginBottom:8}}>Ou entrer l'adresse MAC manuellement :</Text>
            <TextInput style={cn.manualInput} placeholder="00:0D:18:AA:BB:CC" placeholderTextColor={C.muted} value={manual} onChangeText={setManual} autoCapitalize="characters"/>
            <TouchableOpacity style={[cn.scanBtn,{marginTop:8}]} onPress={()=>connectTo({address:manual,name:'ELM327 Manuel'})} disabled={!manual||!!connecting}>
              <Text style={cn.scanTxt}>{connecting?'Connexion...':'CONNECTER MANUELLEMENT'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Guide */}
      <View style={cn.guide}>
        <Text style={cn.guideTitle}>📘 Guide de connexion</Text>
        <Text style={cn.guideTxt}>
          {'1. Brancher ELM327 sur prise OBD2\n   (sous le tableau de bord, côté conducteur)\n\n2. Contact voiture en position ON\n\n3. Activer Bluetooth Android\n\n4. Appairer l\'ELM327 dans Paramètres Bluetooth\n   (PIN: 1234 ou 0000)\n\n5. Revenir ici → Rechercher → Sélectionner'}
        </Text>
        <View style={cn.tip}>
          <Text style={{color:C.yellow,fontSize:12,lineHeight:18}}>
            ⚠️ Fermer Torque ou toute autre app OBD2 avant de connecter. Une seule app peut utiliser le Bluetooth à la fois.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const cn = StyleSheet.create({
  statusCard:{flexDirection:'row',alignItems:'center',margin:12,padding:14,backgroundColor:'#0f1520',borderRadius:10,borderWidth:1,borderColor:'#1a2535',gap:10},
  dot:{width:10,height:10,borderRadius:5},
  statusTxt:{color:'#b8d0e8',fontSize:15,fontWeight:'600',fontFamily:'monospace'},
  deviceTxt:{color:'#3d5570',fontSize:11,fontFamily:'monospace',marginTop:3},
  discBtn:{borderWidth:1,borderColor:'#ff205050',borderRadius:6,paddingHorizontal:10,paddingVertical:5},
  scanBtn:{backgroundColor:'#00c8ff15',borderWidth:1,borderColor:'#00c8ff',borderRadius:10,padding:15,alignItems:'center',marginBottom:12},
  scanTxt:{color:'#00c8ff',fontWeight:'700',fontSize:13,letterSpacing:1},
  device:{flexDirection:'row',alignItems:'center',backgroundColor:'#0a0e18',padding:14,borderRadius:8,borderWidth:1,borderColor:'#1a2535',marginBottom:8},
  dName:{color:'#b8d0e8',fontSize:14,fontWeight:'500',marginBottom:2},
  dAddr:{color:'#3d5570',fontSize:11,fontFamily:'monospace'},
  manualSection:{marginTop:16,paddingTop:14,borderTopWidth:1,borderTopColor:'#1a2535'},
  manualInput:{backgroundColor:'#0a0e18',borderWidth:1,borderColor:'#1a2535',borderRadius:8,padding:12,color:'#b8d0e8',fontSize:14,fontFamily:'monospace'},
  guide:{backgroundColor:'#0f1520',margin:12,padding:16,borderRadius:10,borderWidth:1,borderColor:'#1a2535',marginBottom:24},
  guideTitle:{color:'#00c8ff',fontSize:13,fontWeight:'700',fontFamily:'monospace',marginBottom:12},
  guideTxt:{color:'#b8d0e8',fontSize:13,lineHeight:22},
  tip:{backgroundColor:'#ffc80010',borderWidth:1,borderColor:'#ffc80040',borderRadius:8,padding:12,marginTop:12},
});
