import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useApp } from '../context/AppContext';
import OBDService from '../services/OBDService';
import { ALL_SENSORS_CONNECTORS, SENSOR_REF, GROUND_POINTS } from '../utils/sensorReference';

const { width } = Dimensions.get('window');
const C = {
  bg:'#050810', surface:'#0a0e18', panel:'#0f1520', border:'#1a2535',
  accent:'#00c8ff', accent2:'#ff6020', green:'#00ff88', yellow:'#ffc800',
  red:'#ff2050', text:'#b8d0e8', muted:'#3d5570',
};
const TABS = ['📋 Liste', '📊 Temps réel', '🔌 Câblage', '🩺 Rapport auto'];

export default function HealthReportScreen({ navigation }) {
  const { state, actions } = useApp();
  const [tab, setTab]         = useState(0);
  const [scanning, setScanning] = useState(false);
  const [selCat, setSelCat]   = useState('Tous');
  const [openSensor, setOpenSensor] = useState(null);
  const report = state.healthReport;
  const d = state.liveData;

  // ──────────────────────────────────────────────
  // TAB 0 — LISTE CAPTEURS & CONNECTEURS
  // ──────────────────────────────────────────────
  const CATS = ['Tous','Moteur','Allumage','Injection','Admission','Électrique','Refroid.','ECM'];

  const liveStatusOf = (sensor) => {
    // Map sensor id → liveData key
    const map = {
      map:'map', ect:'ect', iat:'iat', tps:'tps', o2up:'o2', o2dn:'o2b',
      batt:'batt', rpm:'rpm', ltft:'ltft', stft:'stft', load:'load',
      fuel_p:'fuelPressure', maf:'maf', inj1:'inj1', inj2:'inj2', inj3:'inj3', inj4:'inj4',
    };
    const key = map[sensor.id];
    if (!key) return 'unknown';
    const val = d[key];
    if (!val && val !== 0) return 'nodata';
    const ref = Object.values(SENSOR_REF).find(r => r.pid === sensor.pid);
    if (!ref) return 'nodata';
    return (val >= ref.normalMin && val <= ref.normalMax) ? 'ok' : 'fail';
  };

  const stIcon = s => ({ok:'✅',fail:'❌',nodata:'⚠️',unknown:'❓'}[s]||'❓');
  const stCol  = s => ({ok:C.green,fail:C.red,nodata:C.yellow,unknown:C.muted}[s]||C.muted);

  const filtered = ALL_SENSORS_CONNECTORS.filter(s => selCat === 'Tous' || s.cat === selCat);

  const Tab0 = () => (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{maxHeight:46,paddingVertical:6}} contentContainerStyle={{paddingHorizontal:12,gap:7}}>
        {CATS.map(cat=>(
          <TouchableOpacity key={cat} style={[s.catBtn, selCat===cat&&s.catOn]} onPress={()=>setSelCat(cat)}>
            <Text style={[s.catTxt, selCat===cat&&{color:C.accent}]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={s.count}>{filtered.length} éléments</Text>
      {filtered.map(sensor=>{
        const st = liveStatusOf(sensor);
        const col = stCol(st);
        const open = openSensor===sensor.id;
        return (
          <TouchableOpacity key={sensor.id} style={[s.sCard,{borderLeftColor:col,borderLeftWidth:3}]}
            onPress={()=>setOpenSensor(open?null:sensor.id)}>
            <View style={{flexDirection:'row',alignItems:'center'}}>
              <View style={{flex:1}}>
                <View style={{flexDirection:'row',gap:8,marginBottom:3}}>
                  <Text style={s.sCat}>{sensor.cat}</Text>
                  <Text style={s.sType}>{sensor.type}</Text>
                </View>
                <Text style={s.sName}>{sensor.name}</Text>
                <Text style={s.sNormal}>{sensor.normal}</Text>
              </View>
              <View style={{alignItems:'center',gap:2}}>
                <Text style={{fontSize:20}}>{stIcon(st)}</Text>
                <Text style={[{fontSize:9,fontFamily:'monospace'},{ color:col}]}>{sensor.pins.split(',')[0]}</Text>
              </View>
            </View>
            {open&&(
              <View style={s.sDetail}>
                <Text style={s.sDetailRow}>📍 <Text style={{color:C.text}}>Broches:</Text> {sensor.pins}</Text>
                <Text style={s.sDetailRow}>🔧 <Text style={{color:C.text}}>Méthode de test:</Text> {sensor.testMethod}</Text>
                {sensor.pid&&<Text style={s.sDetailRow}>📡 <Text style={{color:C.text}}>PID OBD2:</Text> {sensor.pid}</Text>}
                <Text style={s.sDetailRow}>✅ <Text style={{color:C.text}}>Valeur normale:</Text> {sensor.normal}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
      <Text style={s.sec}>🔌 POINTS DE MASSE</Text>
      {GROUND_POINTS.map(g=>(
        <View key={g.id} style={s.groundCard}>
          <View style={{flex:1}}>
            <Text style={{color:C.text,fontSize:13,marginBottom:2}}>{g.name}</Text>
            <Text style={{color:C.muted,fontSize:11}}>{g.location}</Text>
          </View>
          <Text style={{color:C.green,fontSize:14,fontWeight:'700',fontFamily:'monospace'}}>max {g.max}V</Text>
        </View>
      ))}
    </>
  );

  // ──────────────────────────────────────────────
  // TAB 1 — TEMPS RÉEL vs CONSTRUCTEUR
  // ──────────────────────────────────────────────
  const RT_SENSORS = [
    {label:'RPM Moteur',      k:'rpm',         min:700,  max:850,  unit:'rpm'},
    {label:'Temp. Moteur',    k:'ect',         min:80,   max:95,   unit:'°C'},
    {label:'Temp. Air (IAT)', k:'iat',         min:0,    max:50,   unit:'°C'},
    {label:'MAP Pression',    k:'map',         min:25,   max:45,   unit:'kPa'},
    {label:'O2 Amont',        k:'o2',          min:0.2,  max:0.8,  unit:'V'},
    {label:'O2 Aval',         k:'o2b',         min:0.2,  max:0.8,  unit:'V'},
    {label:'TPS Papillon',    k:'tps',         min:0,    max:5,    unit:'%'},
    {label:'Batterie',        k:'batt',        min:13.5, max:14.5, unit:'V'},
    {label:'LTFT',            k:'ltft',        min:-5,   max:5,    unit:'%'},
    {label:'STFT',            k:'stft',        min:-5,   max:5,    unit:'%'},
    {label:'Charge moteur',   k:'load',        min:10,   max:40,   unit:'%'},
    {label:'Pression carbu.', k:'fuelPressure',min:330,  max:370,  unit:'kPa'},
    {label:'Avance allumage', k:'timing',      min:5,    max:25,   unit:'°'},
    {label:'MAF débit air',   k:'maf',         min:2,    max:6,    unit:'g/s'},
    {label:'Injecteur 1',     k:'inj1',        min:2.0,  max:3.5,  unit:'ms'},
    {label:'Injecteur 2',     k:'inj2',        min:2.0,  max:3.5,  unit:'ms'},
    {label:'Injecteur 3',     k:'inj3',        min:2.0,  max:3.5,  unit:'ms'},
    {label:'Injecteur 4',     k:'inj4',        min:2.0,  max:3.5,  unit:'ms'},
  ];

  const Tab1 = () => (
    <>
      <Text style={s.sec}>📊 VALEURS RÉELLES vs CONSTRUCTEUR</Text>
      <Text style={{color:C.muted,fontSize:11,paddingHorizontal:12,marginBottom:6}}>
        Barre verte = plage constructeur · Curseur = valeur actuelle
      </Text>
      {RT_SENSORS.map(sensor=>{
        const val = d[sensor.k];
        const hasVal = val !== null && val !== undefined && !isNaN(val) && val !== 0;
        const ok = hasVal && val >= sensor.min && val <= sensor.max;
        const col = !hasVal ? C.muted : ok ? C.green : C.red;
        const range = sensor.max - sensor.min;
        const extended = range * 0.3;
        const totalMin = sensor.min - extended;
        const totalMax = sensor.max + extended;
        const totalRange = totalMax - totalMin;
        const normLeft  = ((sensor.min - totalMin) / totalRange * 100).toFixed(1);
        const normWidth = (range / totalRange * 100).toFixed(1);
        const cursorPct = hasVal ? Math.min(99, Math.max(1, ((val - totalMin) / totalRange * 100))) : null;
        const decim = sensor.unit==='rpm'||sensor.unit==='kPa'?0:sensor.unit==='%'?1:2;
        return (
          <View key={sensor.k} style={s.rtCard}>
            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <Text style={{color:C.text,fontSize:13,fontWeight:'600',flex:1}}>{sensor.label}</Text>
              <View style={{alignItems:'flex-end'}}>
                <Text style={{color:col,fontSize:19,fontWeight:'700',fontFamily:'monospace'}}>
                  {hasVal ? Number(val).toFixed(decim) : 'N/A'} <Text style={{fontSize:11,color:C.muted}}>{sensor.unit}</Text>
                </Text>
                <Text style={{color:C.muted,fontSize:10,fontFamily:'monospace'}}>Réf: {sensor.min}–{sensor.max} {sensor.unit}</Text>
              </View>
            </View>
            <View style={{height:10,backgroundColor:C.border,borderRadius:5,overflow:'hidden',position:'relative',marginBottom:5}}>
              <View style={{position:'absolute',top:0,bottom:0,left:`${normLeft}%`,width:`${normWidth}%`,backgroundColor:C.green+'35',borderRadius:5}}/>
              {cursorPct!==null && <View style={{position:'absolute',top:0,bottom:0,left:`${cursorPct}%`,width:3,backgroundColor:col,borderRadius:2}}/>}
            </View>
            <Text style={{color:col,fontSize:10,fontFamily:'monospace'}}>
              {!hasVal?'❓ Pas de données OBD2':ok?'✅ Dans la plage constructeur':val<sensor.min?`⬇️ Bas — min constructeur: ${sensor.min}${sensor.unit}`:`⬆️ Haut — max constructeur: ${sensor.max}${sensor.unit}`}
            </Text>
          </View>
        );
      })}
    </>
  );

  // ──────────────────────────────────────────────
  // TAB 2 — SCHÉMA CÂBLAGE
  // ──────────────────────────────────────────────
  const WIRING_NODES = [
    {id:'ecm',  label:'ECM\nBosch',   x:0.50,y:0.10,col:C.accent,  lk:null},
    {id:'map',  label:'T_MAP',        x:0.12,y:0.28,col:C.green,   lk:'map'},
    {id:'ect',  label:'ECT',          x:0.27,y:0.22,col:C.yellow,  lk:'ect'},
    {id:'tps',  label:'TPS',          x:0.42,y:0.28,col:C.green,   lk:'tps'},
    {id:'o2u',  label:'O2↑',          x:0.62,y:0.28,col:C.accent2, lk:'o2'},
    {id:'o2d',  label:'O2↓',          x:0.77,y:0.22,col:C.muted,   lk:'o2b'},
    {id:'ckp',  label:'CKP',          x:0.12,y:0.48,col:C.green,   lk:null},
    {id:'cmp',  label:'CMP',          x:0.27,y:0.53,col:C.green,   lk:null},
    {id:'isa',  label:'ISA',          x:0.42,y:0.48,col:C.yellow,  lk:null},
    {id:'kno',  label:'KNOCK',        x:0.62,y:0.48,col:C.yellow,  lk:null},
    {id:'inj',  label:'INJ×4',        x:0.87,y:0.43,col:C.accent2, lk:'inj1'},
    {id:'bat',  label:'BATT',         x:0.12,y:0.70,col:C.green,   lk:'batt'},
    {id:'alt',  label:'ALT',          x:0.27,y:0.70,col:C.green,   lk:'batt'},
    {id:'obd',  label:'OBD2\n16p',   x:0.50,y:0.73,col:C.accent,  lk:null},
    {id:'gnd',  label:'MASSE',        x:0.77,y:0.70,col:C.red,     lk:null},
  ];
  const WW = width - 24, WH = 320;

  const nodeCol = (node) => {
    if (node.id === 'ecm' || node.id === 'obd') return node.col;
    if (!node.lk) return C.muted;
    const val = d[node.lk];
    if (!val && val !== 0) return C.muted;
    return C.green;
  };

  const Tab2 = () => (
    <>
      <Text style={s.sec}>🔌 SCHÉMA CÂBLAGE — G4HG BOSCH M7.9.8</Text>
      <View style={{width:WW,height:WH,backgroundColor:C.panel,borderRadius:12,borderWidth:1,borderColor:C.border,marginHorizontal:12,overflow:'hidden',position:'relative'}}>
        {/* Connexion lines */}
        {WIRING_NODES.filter(n=>n.id!=='ecm').map(n=>{
          const ecm = WIRING_NODES[0];
          const x1=ecm.x*WW, y1=ecm.y*WH, x2=n.x*WW, y2=n.y*WH;
          const len = Math.sqrt((x2-x1)**2+(y2-y1)**2);
          const angle = Math.atan2(y2-y1,x2-x1)*(180/Math.PI);
          return (
            <View key={'l'+n.id} style={{
              position:'absolute', left:x1, top:y1,
              width:len, height:1,
              backgroundColor: nodeCol(n)+'50',
              transform:[{rotate:`${angle}deg`}],
              transformOrigin:'left center',
            }}/>
          );
        })}
        {/* Nodes */}
        {WIRING_NODES.map(n=>{
          const col = nodeCol(n);
          const sensor = ALL_SENSORS_CONNECTORS.find(s=>s.id===n.id||n.id.startsWith(s.id.substring(0,3)));
          return (
            <TouchableOpacity key={n.id} style={{
              position:'absolute',left:n.x*WW-26,top:n.y*WH-14,
              backgroundColor:col+'18',borderWidth:1,borderColor:col,
              borderRadius:6,paddingHorizontal:5,paddingVertical:3,alignItems:'center',
            }}
            onPress={()=>Alert.alert(n.label.replace('\n',' '),
              sensor?`Type: ${sensor.type}\nBroches: ${sensor.pins}\nNormal: ${sensor.normal}\nTest: ${sensor.testMethod}`
              :'Appuyez sur l\'onglet Liste pour les détails')}>
              <Text style={{color:col,fontSize:9,fontFamily:'monospace',fontWeight:'700',textAlign:'center'}}>{n.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={{color:C.muted,fontSize:11,textAlign:'center',padding:10,lineHeight:17}}>
        🟢 Signal reçu  ·  ⬛ Pas de données OBD2{'\n'}Appuyez sur un bloc pour voir les détails
      </Text>

      {/* ECM pin table */}
      <Text style={s.sec}>📋 BROCHES ECM PRINCIPALES</Text>
      {[
        ['ECM 5','Chauffage O2 amont','12V alimentation'],
        ['ECM 13','CMP Signal','Hall IC 0-5V'],
        ['ECM 15','CKP Signal','Hall IC 0-5V'],
        ['ECM 18','Knock Signal','Piézoélectrique µV'],
        ['ECM 25','Masse ECM','< 0.05V chute tension'],
        ['ECM 36','O2 Amont Signal','0.2-0.8V oscillant'],
        ['ECM 45','ECT Signal','0.95-1.55V à 80°C'],
        ['ECM 54','TPS Signal','0.5V fermé / 4.5V plein'],
        ['ECM 55','TPS Vref 5V','4.9-5.1V'],
        ['ECM 70','ISA Bobine fermeture','250Hz PWM'],
        ['ECM 71','ISA Bobine ouverture','250Hz PWM'],
        ['ECM 78','MAP Signal','3.8-4.2V repos'],
        ['ECM 79','MAP Masse signal','< 0.05V'],
        ['ECM 80','MAP Vref 5V','4.9-5.1V'],
        ['ECM 91','Injecteur 1','Signal commande GND'],
        ['ECM 92','Injecteur 2','Signal commande GND'],
        ['ECM 93','Injecteur 3','Signal commande GND'],
        ['ECM 94','Injecteur 4','Signal commande GND'],
      ].map(([pin,nom,val],i)=>(
        <View key={pin} style={[{flexDirection:'row',paddingHorizontal:12,paddingVertical:7,alignItems:'center'},i%2===0&&{backgroundColor:C.surface}]}>
          <Text style={{color:C.accent,fontSize:11,fontFamily:'monospace',fontWeight:'700',width:65}}>{pin}</Text>
          <Text style={{color:C.text,fontSize:11,flex:1}}>{nom}</Text>
          <Text style={{color:C.muted,fontSize:10,fontFamily:'monospace',textAlign:'right'}}>{val}</Text>
        </View>
      ))}
    </>
  );

  // ──────────────────────────────────────────────
  // TAB 3 — RAPPORT AUTO COMPLET
  // ──────────────────────────────────────────────
  const runScan = async () => {
    setScanning(true);
    try {
      const r = await OBDService.generateHealthReport(state.liveData);
      actions.setHealthReport(r);
    } catch(e) { Alert.alert('Erreur', e.message); }
    setScanning(false);
  };

  const SC = (n) => n >= 80 ? C.green : n >= 50 ? C.yellow : C.red;

  const Tab3 = () => (
    <>
      {report ? (
        <View style={[s.scoreCard,{borderColor:SC(report.score)+'60'}]}>
          <View style={[s.circle,{borderColor:SC(report.score)}]}>
            <Text style={[s.scoreNum,{color:SC(report.score)}]}>{report.score}</Text>
            <Text style={{color:C.muted,fontSize:11}}>%</Text>
          </View>
          <View style={{flex:1}}>
            <Text style={[{fontSize:14,fontWeight:'700',marginBottom:4},{color:SC(report.score)}]}>
              {report.score>=80?'✅ Système en bonne santé':report.score>=50?'⚠️ Anomalies détectées':'🚨 Problèmes critiques'}
            </Text>
            <Text style={{color:C.muted,fontSize:12,marginBottom:2}}>{report.summary}</Text>
            <Text style={{color:C.muted,fontSize:10,fontFamily:'monospace'}}>Scan: {report.timestamp}</Text>
          </View>
        </View>
      ):(
        <View style={s.noReport}>
          <Text style={{color:C.muted,fontSize:14,textAlign:'center'}}>Aucune analyse disponible{'\n'}Appuyez sur SCAN COMPLET</Text>
        </View>
      )}

      <TouchableOpacity style={s.scanBtn} onPress={runScan} disabled={scanning}>
        {scanning
          ? <><ActivityIndicator color={C.accent} size="small"/><Text style={s.scanTxt}> Scan en cours...</Text></>
          : <Text style={s.scanTxt}>🔍 SCAN COMPLET AUTOMATIQUE</Text>
        }
      </TouchableOpacity>

      {report?.issues?.length > 0 && (
        <>
          <Text style={s.sec}>🚨 PROBLÈMES ({report.issues.length})</Text>
          {report.issues.map((iss,i)=>(
            <View key={i} style={[s.issCard,{borderColor:C.red+'50'}]}>
              <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:5}}>
                <Text style={{color:C.text,fontSize:14,fontWeight:'700'}}>{iss.sensor}</Text>
                <Text style={{color:C.red,fontSize:16,fontWeight:'700',fontFamily:'monospace'}}>{iss.value} {iss.unit}</Text>
              </View>
              <Text style={{color:C.red,fontSize:12,marginBottom:4}}>{iss.msg}</Text>
              {iss.min!==undefined&&<Text style={{color:C.muted,fontSize:11,fontFamily:'monospace'}}>Plage constructeur: {iss.min}–{iss.max} {iss.unit}</Text>}
            </View>
          ))}
        </>
      )}

      {report?.warnings?.length > 0 && (
        <>
          <Text style={s.sec}>⚠️ AVERTISSEMENTS ({report.warnings.length})</Text>
          {report.warnings.map((w,i)=>(
            <View key={i} style={[s.issCard,{borderColor:C.yellow+'50'}]}>
              <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
                <Text style={{color:C.text,fontSize:13,fontWeight:'600'}}>{w.sensor}</Text>
                <Text style={{color:C.yellow,fontSize:13,fontFamily:'monospace'}}>{w.value}</Text>
              </View>
              <Text style={{color:C.yellow,fontSize:12}}>{w.msg}</Text>
            </View>
          ))}
        </>
      )}

      {report?.ok?.length > 0 && (
        <>
          <Text style={s.sec}>✅ CAPTEURS NORMAUX ({report.ok.length})</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:12,gap:6}}>
            {report.ok.map((item,i)=>(
              <View key={i} style={{backgroundColor:C.green+'10',borderWidth:1,borderColor:C.green+'40',borderRadius:6,paddingHorizontal:10,paddingVertical:5}}>
                <Text style={{color:C.green,fontSize:11}}>✓ {item.sensor}: {item.value} {item.unit}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {report?.issues?.length > 0 && (
        <>
          <Text style={s.sec}>🔧 PLAN DE CORRECTION PRIORITAIRE</Text>
          <View style={{backgroundColor:C.panel,borderRadius:12,margin:12,padding:14,borderWidth:1,borderColor:C.border}}>
            {report.issues.slice(0,5).map((iss,i)=>(
              <View key={i} style={{flexDirection:'row',gap:10,marginBottom:10,paddingBottom:10,borderBottomWidth:i<Math.min(4,report.issues.length-1)?1:0,borderBottomColor:C.border}}>
                <Text style={{fontSize:18}}>{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</Text>
                <View style={{flex:1}}>
                  <Text style={{color:C.text,fontSize:13,fontWeight:'700',marginBottom:3}}>Corriger: {iss.sensor}</Text>
                  <Text style={{color:C.muted,fontSize:11,lineHeight:17,marginBottom:4}}>{iss.msg}</Text>
                  <TouchableOpacity onPress={()=>navigation.navigate('Correction')}>
                    <Text style={{color:C.accent2,fontSize:12,fontWeight:'600'}}>→ Ouvrir Correction & Reset</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </>
  );

  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{maxHeight:46,backgroundColor:C.surface,borderBottomWidth:1,borderBottomColor:C.border,paddingVertical:6}}
        contentContainerStyle={{paddingHorizontal:8,gap:5}}>
        {TABS.map((t,i)=>(
          <TouchableOpacity key={i} style={[s.tabBtn,tab===i&&s.tabOn]} onPress={()=>setTab(i)}>
            <Text style={[s.tabTxt,tab===i&&{color:C.accent}]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{flex:1}} contentContainerStyle={{paddingBottom:30}}>
        {tab===0 && <Tab0/>}
        {tab===1 && <Tab1/>}
        {tab===2 && <Tab2/>}
        {tab===3 && <Tab3/>}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sec:{color:'#00c8ff',fontSize:10,fontFamily:'monospace',letterSpacing:2,textTransform:'uppercase',padding:12,paddingBottom:6},
  count:{color:'#3d5570',fontSize:11,fontFamily:'monospace',paddingHorizontal:12,paddingBottom:4},
  tabBtn:{paddingHorizontal:13,paddingVertical:6,borderRadius:20,backgroundColor:'#0f1520',borderWidth:1,borderColor:'#1a2535'},
  tabOn:{borderColor:'#00c8ff',backgroundColor:'#00c8ff15'},
  tabTxt:{color:'#3d5570',fontSize:11,fontWeight:'600'},
  catBtn:{backgroundColor:'#0f1520',borderRadius:20,paddingHorizontal:12,paddingVertical:5,borderWidth:1,borderColor:'#1a2535'},
  catOn:{borderColor:'#00c8ff',backgroundColor:'#00c8ff15'},
  catTxt:{color:'#3d5570',fontSize:11},
  sCard:{backgroundColor:'#0f1520',marginHorizontal:12,marginBottom:5,borderRadius:8,padding:12,borderWidth:1,borderColor:'#1a2535'},
  sCat:{color:'#00c8ff',fontSize:8,fontFamily:'monospace',textTransform:'uppercase',letterSpacing:1},
  sType:{color:'#3d5570',fontSize:8,fontFamily:'monospace'},
  sName:{color:'#b8d0e8',fontSize:13,fontWeight:'600',marginBottom:2},
  sNormal:{color:'#3d5570',fontSize:10,fontFamily:'monospace'},
  sDetail:{marginTop:8,paddingTop:8,borderTopWidth:1,borderTopColor:'#1a2535'},
  sDetailRow:{color:'#3d5570',fontSize:11,lineHeight:18,marginBottom:2},
  groundCard:{flexDirection:'row',alignItems:'center',backgroundColor:'#0f1520',marginHorizontal:12,marginBottom:5,borderRadius:8,padding:12,borderWidth:1,borderColor:'#1a2535'},
  rtCard:{backgroundColor:'#0f1520',marginHorizontal:12,marginBottom:6,borderRadius:8,padding:12,borderWidth:1,borderColor:'#1a2535'},
  scoreCard:{flexDirection:'row',alignItems:'center',margin:12,padding:16,backgroundColor:'#0f1520',borderRadius:12,borderWidth:1,gap:14},
  circle:{width:66,height:66,borderRadius:33,borderWidth:3,alignItems:'center',justifyContent:'center'},
  scoreNum:{fontSize:24,fontWeight:'700',fontFamily:'monospace'},
  noReport:{backgroundColor:'#0f1520',margin:12,padding:30,borderRadius:12,borderWidth:1,borderColor:'#1a2535',alignItems:'center'},
  scanBtn:{backgroundColor:'#00c8ff15',borderWidth:1,borderColor:'#00c8ff',borderRadius:10,padding:14,margin:12,alignItems:'center',flexDirection:'row',justifyContent:'center',gap:8},
  scanTxt:{color:'#00c8ff',fontWeight:'700',fontSize:13,letterSpacing:1},
  issCard:{backgroundColor:'#0f1520',borderRadius:10,padding:14,marginHorizontal:12,marginBottom:8,borderWidth:1},
});
