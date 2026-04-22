import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { useApp } from '../context/AppContext';
import OBDService from '../services/OBDService';
import { SENSOR_REF } from '../utils/sensorReference';

const { width } = Dimensions.get('window');
const C = { bg:'#050810',surface:'#0a0e18',panel:'#0f1520',border:'#1a2535',accent:'#00c8ff',accent2:'#ff6020',green:'#00ff88',yellow:'#ffc800',red:'#ff2050',text:'#b8d0e8',muted:'#3d5570' };

const fmt = (v, d=1) => (v !== null && v !== undefined && !isNaN(v)) ? Number(v).toFixed(d) : '--';

function Gauge({ label, value, unit, min, max, icon, onPress }) {
  const pct = Math.min(100, Math.max(0, ((value||0) - min) / (max - min) * 100));
  const status = (!value || value===0) ? 'none' : (value<min||value>max) ? 'bad' : (pct<12||pct>88) ? 'warn' : 'ok';
  const col = status==='bad' ? C.red : status==='warn' ? C.yellow : status==='ok' ? C.green : C.muted;
  return (
    <TouchableOpacity style={[s.gauge,{borderColor:col+'50'}]} onPress={onPress} activeOpacity={0.7}>
      <View style={s.gaugeTop}>
        <Text style={s.gaugeIcon}>{icon}</Text>
        <Text style={s.gaugeLbl}>{label}</Text>
      </View>
      <Text style={[s.gaugeVal,{color:col}]}>{fmt(value,unit==='V'?2:unit==='%'?1:0)}<Text style={s.gaugeUnit}> {unit}</Text></Text>
      <View style={s.bar}><View style={[s.barFill,{width:`${pct}%`,backgroundColor:col}]}/></View>
      <Text style={[s.gaugeStatus,{color:col}]}>{status==='bad'?'⚠ HORS PLAGE':status==='warn'?'◉ LIMITE':status==='ok'?'✓ NORMAL':'? N/A'}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ navigation }) {
  const { state, actions } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const d = state.liveData;

  useEffect(() => {
    if (state.isConnected) {
      OBDService.startReading(data => actions.updateLive(data), state.refreshRate);
    }
    return () => OBDService.stopReading();
  }, [state.isConnected]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (state.isConnected) {
      const report = await OBDService.generateHealthReport(state.liveData);
      actions.setHealthReport(report);
    }
    setRefreshing(false);
  }, [state.isConnected, state.liveData]);

  const alertCount = [
    d.o2 > 0 && d.o2 < 0.2,
    Math.abs(d.ltft||0) > 10,
    d.batt > 5 && d.batt < 13.0,
    d.ect > 100,
    d.fuelPressure > 0 && d.fuelPressure < 300,
  ].filter(Boolean).length;

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent}/>}>
      {/* Barre statut */}
      <View style={s.statusBar}>
        <View style={[s.dot,{backgroundColor:state.isConnected?C.green:C.muted}]}/>
        <Text style={s.statusTxt}>{state.isConnected ? `✅ ${state.connectedDevice?.name||'ELM327'} connecté` : '🔴 Déconnecté — aller dans Connexion'}</Text>
      </View>

      {/* Alertes */}
      {alertCount > 0 && (
        <TouchableOpacity style={s.alertBanner} onPress={() => navigation.navigate('HealthReport')}>
          <Text style={s.alertTxt}>🚨 {alertCount} anomalie(s) détectée(s) — Appuyez pour le rapport</Text>
        </TouchableOpacity>
      )}

      {/* Actions rapides */}
      <View style={s.quickRow}>
        {[
          {icon:'🤖',label:'IA Analyse', nav:'AI'},
          {icon:'📋',label:'Rapport', nav:'HealthReport'},
          {icon:'⚠️',label:'DTC', nav:'DTC'},
          {icon:'🔧',label:'Correction', nav:'Correction'},
        ].map(({icon,label,nav}) => (
          <TouchableOpacity key={nav} style={s.qBtn} onPress={()=>navigation.navigate(nav)}>
            <Text style={s.qIcon}>{icon}</Text>
            <Text style={s.qLbl}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Jauges */}
      <Text style={s.section}>⚡ DONNÉES TEMPS RÉEL</Text>
      <View style={s.grid}>
        <Gauge label="RPM" value={d.rpm} unit="rpm" min={700} max={900} icon="⚡" onPress={()=>{}}/>
        <Gauge label="Temp. Moteur" value={d.ect} unit="°C" min={80} max={95} icon="🌡️" onPress={()=>{}}/>
        <Gauge label="O2 Amont" value={d.o2} unit="V" min={0.2} max={0.8} icon="🔬" onPress={()=>{}}/>
        <Gauge label="Batterie" value={d.batt} unit="V" min={13.5} max={14.5} icon="🔋" onPress={()=>{}}/>
        <Gauge label="LTFT" value={d.ltft} unit="%" min={-5} max={5} icon="⛽" onPress={()=>{}}/>
        <Gauge label="MAP" value={d.map} unit="kPa" min={25} max={45} icon="📊" onPress={()=>{}}/>
        <Gauge label="Temp. Air" value={d.iat} unit="°C" min={0} max={50} icon="💨" onPress={()=>{}}/>
        <Gauge label="TPS" value={d.tps} unit="%" min={0} max={100} icon="🎯" onPress={()=>{}}/>
        <Gauge label="Pression Carbu." value={d.fuelPressure} unit="kPa" min={330} max={370} icon="🛢️" onPress={()=>{}}/>
        <Gauge label="Avance Allumage" value={d.timing} unit="°" min={5} max={25} icon="⚙️" onPress={()=>{}}/>
      </View>

      {/* Injecteurs */}
      <Text style={s.section}>💉 INJECTEURS — Temps d'ouverture (2.0-3.5ms)</Text>
      <View style={s.injRow}>
        {[d.inj1,d.inj2,d.inj3,d.inj4].map((v,i) => {
          const ok = v >= 2.0 && v <= 3.5;
          const col = !v ? C.muted : ok ? C.green : C.red;
          return (
            <View key={i} style={[s.injCard,{borderColor:col+'60'}]}>
              <Text style={[s.injLabel,{color:C.muted}]}>CYL {i+1}</Text>
              <Text style={[s.injVal,{color:col}]}>{v ? fmt(v,2) : '--'}</Text>
              <Text style={s.injUnit}>ms</Text>
              <Text style={[s.injStatus,{color:col}]}>{!v?'N/A':ok?'✓':'⚠'}</Text>
            </View>
          );
        })}
      </View>

      <TouchableOpacity style={s.aiBtn} onPress={()=>navigation.navigate('AI')}>
        <Text style={s.aiBtnTxt}>🤖 LANCER L'ANALYSE IA COMPLÈTE</Text>
      </TouchableOpacity>
      <View style={{height:24}}/>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:C.bg},
  statusBar:{flexDirection:'row',alignItems:'center',padding:12,backgroundColor:C.surface,borderBottomWidth:1,borderBottomColor:C.border},
  dot:{width:9,height:9,borderRadius:5,marginRight:8},
  statusTxt:{color:C.text,fontSize:12,fontFamily:'monospace',flex:1},
  alertBanner:{backgroundColor:C.red+'15',borderWidth:1,borderColor:C.red+'50',margin:12,borderRadius:10,padding:12},
  alertTxt:{color:C.red,fontWeight:'700',fontSize:13,textAlign:'center'},
  quickRow:{flexDirection:'row',justifyContent:'space-around',padding:12,paddingBottom:4},
  qBtn:{alignItems:'center',padding:10,backgroundColor:C.panel,borderRadius:10,borderWidth:1,borderColor:C.border,minWidth:72},
  qIcon:{fontSize:22,marginBottom:4},
  qLbl:{color:C.text,fontSize:9,fontFamily:'monospace',textTransform:'uppercase'},
  section:{color:C.accent,fontSize:10,fontFamily:'monospace',letterSpacing:2,textTransform:'uppercase',padding:12,paddingBottom:6},
  grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',paddingHorizontal:12},
  gauge:{width:(width-36)/2,backgroundColor:C.panel,borderRadius:10,padding:12,marginBottom:10,borderWidth:1},
  gaugeTop:{flexDirection:'row',alignItems:'center',marginBottom:6},
  gaugeIcon:{fontSize:13,marginRight:5},
  gaugeLbl:{color:C.muted,fontSize:9,fontFamily:'monospace',textTransform:'uppercase',flex:1},
  gaugeVal:{fontSize:26,fontWeight:'700',fontFamily:'monospace',marginBottom:5},
  gaugeUnit:{fontSize:11,color:C.muted},
  bar:{height:3,backgroundColor:C.border,borderRadius:2,marginBottom:5,overflow:'hidden'},
  barFill:{height:3,borderRadius:2},
  gaugeStatus:{fontSize:9,fontFamily:'monospace'},
  injRow:{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:12,marginBottom:12},
  injCard:{flex:1,marginHorizontal:3,backgroundColor:C.panel,borderRadius:8,padding:10,borderWidth:1,alignItems:'center'},
  injLabel:{fontSize:9,fontFamily:'monospace',textTransform:'uppercase',marginBottom:2},
  injVal:{fontSize:20,fontWeight:'700',fontFamily:'monospace'},
  injUnit:{fontSize:10,color:C.muted},
  injStatus:{fontSize:12,marginTop:2},
  aiBtn:{backgroundColor:C.accent2+'20',borderWidth:1,borderColor:C.accent2,borderRadius:10,padding:15,margin:12,alignItems:'center'},
  aiBtnTxt:{color:C.accent2,fontWeight:'700',fontSize:14,letterSpacing:1},
});
