// ==================== DTCScreen.js ====================
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useApp } from '../context/AppContext';
import OBDService from '../services/OBDService';
import { DTC_DB } from '../utils/sensorReference';

const C = { bg:'#050810',panel:'#0f1520',border:'#1a2535',accent:'#00c8ff',accent2:'#ff6020',green:'#00ff88',yellow:'#ffc800',red:'#ff2050',text:'#b8d0e8',muted:'#3d5570' };

export function DTCScreen() {
  const { state, actions } = useApp();
  const [reading, setReading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [selected, setSelected] = useState(null);

  const read = async () => {
    if (!state.isConnected) { Alert.alert('Non connecté',"Connectez l'ELM327 d'abord."); return; }
    setReading(true);
    try {
      const codes = await OBDService.readDTC();
      actions.setDTC(codes);
      if (!codes.length) Alert.alert('✅ Aucun code défaut','Système OK');
    } catch(e) { Alert.alert('Erreur', e.message); }
    setReading(false);
  };

  const clear = async () => {
    if (!state.isConnected) { Alert.alert('Non connecté',"Connectez l'ELM327 d'abord."); return; }
    Alert.alert('Effacer codes ?','',[ {text:'Annuler',style:'cancel'}, {text:'Effacer',style:'destructive',onPress:async()=>{
      setClearing(true);
      await OBDService.clearDTC();
      actions.setDTC([]);
      setClearing(false);
      Alert.alert('✅ Codes effacés');
    }}]);
  };

  const sevCol = s => s==='critical'?C.red:s==='high'?C.red:s==='medium'?C.yellow:C.green;
  const sevLabel = s => s==='critical'?'🚨 CRITIQUE':s==='high'?'🔴 URGENT':s==='medium'?'🟡 MOYEN':'🟢 INFO';

  const renderDTC = ({item}) => (
    <TouchableOpacity style={[dt.item, selected?.code===item.code&&{borderColor:C.accent2}]} onPress={()=>setSelected(selected?.code===item.code?null:item)}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <Text style={[dt.code,{color:sevCol(item.severity)}]}>{item.code}</Text>
        <View style={[dt.badge,{backgroundColor:sevCol(item.severity)+'20'}]}>
          <Text style={[dt.badgeTxt,{color:sevCol(item.severity)}]}>{sevLabel(item.severity)}</Text>
        </View>
      </View>
      <Text style={dt.desc}>{item.description||item.desc||'Code inconnu'}</Text>
      {selected?.code===item.code&&item.known&&(
        <View style={dt.details}>
          {item.causes&&<><Text style={dt.dTitle}>Causes probables:</Text>{item.causes.map((c,i)=><Text key={i} style={dt.dTxt}>• {c}</Text>)}</>}
          {item.tests&&<><Text style={[dt.dTitle,{marginTop:8}]}>Tests à effectuer:</Text>{item.tests.map((t,i)=><Text key={i} style={dt.dTxt}>• {t}</Text>)}</>}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={{flex:1,backgroundColor:C.bg}}>
      <View style={{flexDirection:'row',margin:12,gap:10}}>
        <TouchableOpacity style={[dt.btn,{flex:1,borderColor:C.accent}]} onPress={read} disabled={reading}>
          {reading?<ActivityIndicator color={C.accent}/>:<Text style={[dt.btnTxt,{color:C.accent}]}>🔍 LIRE DTC</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[dt.btn,{flex:1,borderColor:C.red}]} onPress={clear} disabled={clearing||!state.dtcCodes.length}>
          {clearing?<ActivityIndicator color={C.red}/>:<Text style={[dt.btnTxt,{color:C.red}]}>🗑 EFFACER</Text>}
        </TouchableOpacity>
      </View>
      <Text style={dt.section}>⚠️ CODES DÉTECTÉS ({state.dtcCodes.length})</Text>
      {!state.dtcCodes.length?(
        <View style={[dt.item,{alignItems:'center',padding:24}]}>
          <Text style={{color:C.muted,fontSize:13}}>Appuyez sur LIRE DTC pour scanner</Text>
        </View>
      ):(
        <FlatList data={state.dtcCodes} renderItem={renderDTC} keyExtractor={(i,idx)=>i.code+idx} scrollEnabled={false}/>
      )}
      <Text style={dt.section}>📚 BASE DTC G4HG</Text>
      {Object.entries(DTC_DB).map(([code,info])=>(
        <TouchableOpacity key={code} style={dt.refItem} onPress={()=>Alert.alert(`${code} — ${info.desc}`,`Causes:\n• ${info.causes.join('\n• ')}\n\nTests:\n• ${info.tests.join('\n• ')}`)}>
          <Text style={[dt.refCode,{color:sevCol(info.sev)}]}>{code}</Text>
          <Text style={dt.refDesc}>{info.desc}</Text>
        </TouchableOpacity>
      ))}
      <View style={{height:30}}/>
    </ScrollView>
  );
}

const dt = StyleSheet.create({
  section:{color:'#00c8ff',fontSize:10,fontFamily:'monospace',letterSpacing:2,textTransform:'uppercase',padding:12,paddingBottom:6},
  item:{backgroundColor:'#0f1520',borderRadius:10,padding:14,marginHorizontal:12,marginBottom:8,borderWidth:1,borderColor:'#1a2535'},
  code:{fontSize:18,fontWeight:'700',fontFamily:'monospace'},
  badge:{paddingHorizontal:8,paddingVertical:3,borderRadius:4},
  badgeTxt:{fontSize:9,fontWeight:'700',fontFamily:'monospace'},
  desc:{color:'#b8d0e8',fontSize:13},
  details:{marginTop:10,paddingTop:10,borderTopWidth:1,borderTopColor:'#1a2535'},
  dTitle:{color:'#00c8ff',fontSize:11,fontWeight:'700',fontFamily:'monospace',marginBottom:4},
  dTxt:{color:'#3d5570',fontSize:11,lineHeight:18,marginLeft:8},
  btn:{borderWidth:1,borderRadius:8,padding:12,alignItems:'center',flexDirection:'row',justifyContent:'center',gap:6},
  btnTxt:{fontWeight:'700',fontSize:13,fontFamily:'monospace'},
  refItem:{flexDirection:'row',gap:10,padding:10,marginHorizontal:12,marginBottom:6,backgroundColor:'#0f1520',borderRadius:8,borderWidth:1,borderColor:'#1a2535'},
  refCode:{fontSize:12,fontWeight:'700',fontFamily:'monospace',minWidth:55},
  refDesc:{color:'#3d5570',fontSize:11,flex:1},
});
