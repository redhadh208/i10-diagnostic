import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useApp } from '../context/AppContext';
import OBDService from '../services/OBDService';
import { INJECTOR_SPECS, FUEL_REGULATOR, RESET_PROCEDURES } from '../utils/sensorReference';

const C = { bg:'#050810',surface:'#0a0e18',panel:'#0f1520',border:'#1a2535',accent:'#00c8ff',accent2:'#ff6020',green:'#00ff88',yellow:'#ffc800',red:'#ff2050',text:'#b8d0e8',muted:'#3d5570' };

const Btn = ({label, color, onPress, disabled, small}) => (
  <TouchableOpacity
    style={[st.btn, {borderColor:color, opacity:disabled?0.4:1}, small&&{paddingVertical:7,paddingHorizontal:10}]}
    onPress={onPress} disabled={disabled}
  >
    <Text style={[st.btnTxt, {color}, small&&{fontSize:11}]}>{label}</Text>
  </TouchableOpacity>
);

export default function CorrectionScreen() {
  const { state, actions } = useApp();
  const [loading, setLoading] = useState(false);
  const [injOffsets, setInjOffsets] = useState({inj1:0, inj2:0, inj3:0, inj4:0});
  const [fuelTarget, setFuelTarget] = useState('350');
  const [rpmTarget, setRpmTarget] = useState('750');
  const d = state.liveData;

  const connected = state.isConnected;

  const requireConn = () => { if (!connected) { Alert.alert('Non connecté', "Connectez l'ELM327 d'abord."); return false; } return true; };

  // ---- INJECTEURS ----
  const applyInjOffset = async (injId, offset) => {
    if (!requireConn()) return;
    Alert.alert(`⚠️ Corriger ${injId.toUpperCase()}`, `Appliquer un offset de ${offset > 0 ? '+' : ''}${offset} mg/coup ?\n\nCela modifie la correction IQA dans l'ECM.`,
      [{text:'Annuler',style:'cancel'},{text:'Appliquer',style:'destructive',onPress:async()=>{
        setLoading(true);
        try {
          const cmd = {inj1:'2E20',inj2:'2E21',inj3:'2E22',inj4:'2E23'}[injId];
          const ok = await OBDService.writeAdaptation(cmd, offset * 100);
          if (ok) { actions.setCoding({[injId+'Offset']: offset}); Alert.alert('✅ Appliqué',`Offset ${injId} = ${offset} mg/coup`); }
          else Alert.alert('❌ Refusé','Vérifiez la connexion et le niveau d\'accès ECM.');
        } catch(e){ Alert.alert('Erreur',e.message); }
        setLoading(false);
      }}]
    );
  };

  const resetAllInjectors = async () => {
    if (!requireConn()) return;
    Alert.alert('🔄 Reset tous les injecteurs','Remettre les 4 corrections IQA à 0 (valeur constructeur) ?',
      [{text:'Annuler',style:'cancel'},{text:'Reset usine',style:'destructive',onPress:async()=>{
        setLoading(true);
        for (const id of ['inj1','inj2','inj3','inj4']) {
          const cmd = {inj1:'2E20',inj2:'2E21',inj3:'2E22',inj4:'2E23'}[id];
          await OBDService.writeAdaptation(cmd, 0);
        }
        setInjOffsets({inj1:0,inj2:0,inj3:0,inj4:0});
        actions.setCoding({inj1Offset:0,inj2Offset:0,inj3Offset:0,inj4Offset:0});
        setLoading(false);
        Alert.alert('✅ Reset effectué','Corrections IQA = 0 (valeur constructeur)\n\nEffectuez un cycle de conduite pour vérifier.');
      }}]
    );
  };

  // ---- RÉGULATEUR PRESSION ----
  const applyFuelPressure = async () => {
    if (!requireConn()) return;
    const val = parseFloat(fuelTarget);
    if (isNaN(val) || val < 280 || val > 420) { Alert.alert('Valeur invalide','Entrez entre 280 et 420 kPa'); return; }
    Alert.alert(`⚠️ Pression cible ${val} kPa`,`Construceur: 350 kPa\nNouvelle cible: ${val} kPa\n\nContinuer ?`,
      [{text:'Annuler',style:'cancel'},{text:'Appliquer',style:'destructive',onPress:async()=>{
        setLoading(true);
        const ok = await OBDService.writeAdaptation('2E30', val);
        setLoading(false);
        if (ok) { actions.setCoding({fuelPressureTarget:val}); Alert.alert('✅ Appliqué',`Pression cible = ${val} kPa`); }
        else Alert.alert('❌ Refusé','L\'ECM n\'a pas accepté la commande.');
      }}]
    );
  };

  const resetFuelPressure = async () => {
    if (!requireConn()) return;
    setFuelTarget('350');
    setLoading(true);
    const ok = await OBDService.writeAdaptation('2E30', 350);
    setLoading(false);
    if (ok) { actions.setCoding({fuelPressureTarget:350}); Alert.alert('✅ Reset','Pression cible = 350 kPa (valeur constructeur)'); }
    else Alert.alert('❌ Refusé','Commande non acceptée.');
  };

  // ---- LTFT / ADAPTATIONS CARBURANT ----
  const resetFuelAdaptations = async () => {
    if (!requireConn()) return;
    Alert.alert('⚠️ Reset adaptations carburant','Efface LTFT et STFT.\nLe moteur doit réapprendre ses adaptations.\n\nContinuer ?',
      [{text:'Annuler',style:'cancel'},{text:'Reset',style:'destructive',onPress:async()=>{
        setLoading(true);
        const ok = await OBDService.resetFuelAdaptations();
        setLoading(false);
        if (ok) Alert.alert('✅ Reset effectué','LTFT/STFT remis à 0.\n\nProcédure:\n1. Couper contact 30s\n2. Démarrer sans accélérer\n3. Ralenti 10 min\n4. Conduire 20km varié');
        else Alert.alert('Info','Commande envoyée. Vérifiez les codes DTC.');
      }}]
    );
  };

  // ---- RPM ----
  const fixRPM = async () => {
    if (!requireConn()) return;
    const val = parseInt(rpmTarget);
    if (isNaN(val) || val < 650 || val > 950) { Alert.alert('Valeur invalide','Entrez entre 650 et 950 rpm'); return; }
    Alert.alert(`🔄 RPM cible ${val} rpm`,`Constructeur: 750 rpm\nNouvelle cible: ${val} rpm`,
      [{text:'Annuler',style:'cancel'},{text:'Appliquer',style:'destructive',onPress:async()=>{
        setLoading(true);
        const ok = await OBDService.writeAdaptation('2E10', val);
        setLoading(false);
        if (ok) { actions.setCoding({idleRpmTarget:val}); Alert.alert('✅ Appliqué',`RPM cible = ${val} rpm`); }
        else Alert.alert('❌ Refusé','Commande non acceptée par l\'ECM.');
      }}]
    );
  };

  // ---- RESET COMPLET ----
  const fullFactoryReset = () => {
    Alert.alert(
      '🏭 RESET VALEURS CONSTRUCTEUR COMPLET',
      'Cela va remettre:\n• Tous les offsets injecteurs à 0\n• Pression carbu à 350 kPa\n• RPM ralenti à 750 rpm\n• Effacer les adaptations LTFT/STFT\n\n⚠️ Toutes vos corrections seront perdues !',
      [{text:'Annuler',style:'cancel'},{text:'Reset tout',style:'destructive',onPress:async()=>{
        setLoading(true);
        await OBDService.resetFuelAdaptations();
        for (const id of ['inj1','inj2','inj3','inj4']) {
          const cmd = {inj1:'2E20',inj2:'2E21',inj3:'2E22',inj4:'2E23'}[id];
          await OBDService.writeAdaptation(cmd, 0);
        }
        await OBDService.writeAdaptation('2E30', 350);
        await OBDService.writeAdaptation('2E10', 750);
        setInjOffsets({inj1:0,inj2:0,inj3:0,inj4:0});
        setFuelTarget('350');
        setRpmTarget('750');
        actions.setCoding({inj1Offset:0,inj2Offset:0,inj3Offset:0,inj4Offset:0,fuelPressureTarget:350,idleRpmTarget:750});
        setLoading(false);
        Alert.alert('✅ Reset complet effectué','Toutes les valeurs sont aux réglages constructeur.\n\nEffectuez un cycle de conduite pour réapprentissage.');
      }}]
    );
  };

  return (
    <ScrollView style={st.container}>

      {!connected && (
        <View style={st.warn}><Text style={{color:C.yellow,fontSize:13}}>⚡ Mode démo — Connectez ELM327 pour corrections réelles</Text></View>
      )}

      {/* ===== INJECTEURS ===== */}
      <Text style={st.section}>💉 CORRECTION INJECTEURS (IQA)</Text>
      <View style={st.card}>
        <Text style={st.cardInfo}>
          Référence constructeur: 12-16Ω · 152cc/min · 2.0-3.5ms ralenti{'\n'}
          Équilibre max: ±1.5ms inter-injecteurs
        </Text>
        {INJECTOR_SPECS.corrections.map((inj,i) => {
          const live = [d.inj1,d.inj2,d.inj3,d.inj4][i];
          const offset = injOffsets[inj.id] || 0;
          const liveCol = (!live||live===0)?C.muted:(live>=2&&live<=3.5)?C.green:C.red;
          return (
            <View key={inj.id} style={st.injRow}>
              <View style={{flex:1}}>
                <Text style={st.injName}>{inj.name}</Text>
                <Text style={[st.injLive,{color:liveCol}]}>
                  Actuel: {live?live.toFixed(2)+'ms':'N/A'} {live&&(live>=2&&live<=3.5)?'✅':'⚠️'}
                </Text>
                <Text style={st.injOffset}>Offset: {offset>0?'+':''}{offset} mg/coup</Text>
              </View>
              <View style={st.injBtns}>
                <Btn label="-1" color={C.red} small onPress={()=>{
                  const nv = Math.max(inj.minOffset, offset-1);
                  setInjOffsets(p=>({...p,[inj.id]:nv}));
                }}/>
                <Text style={st.injOffsetBig}>{offset>0?'+':''}{offset}</Text>
                <Btn label="+1" color={C.green} small onPress={()=>{
                  const nv = Math.min(inj.maxOffset, offset+1);
                  setInjOffsets(p=>({...p,[inj.id]:nv}));
                }}/>
                <Btn label="✓" color={C.accent} small onPress={()=>applyInjOffset(inj.id, injOffsets[inj.id]||0)} disabled={loading}/>
              </View>
            </View>
          );
        })}
        <View style={{flexDirection:'row',gap:8,marginTop:12}}>
          <Btn label="🔄 Reset tous injecteurs (valeurs constructeur)" color={C.yellow} onPress={resetAllInjectors} disabled={loading}/>
        </View>
      </View>

      {/* ===== RÉGULATEUR PRESSION ===== */}
      <Text style={st.section}>🛢️ RÉGULATEUR PRESSION CARBURANT</Text>
      <View style={st.card}>
        <Text style={st.cardInfo}>
          Type: Return-less · Cible constructeur: 350 kPa (3.5 bar){'\n'}
          Ralenti: 330-370 kPa · Coupure moteur: {'>'} 280 kPa pendant 5 min
        </Text>
        <View style={st.liveRow}>
          <Text style={st.liveLabel}>Pression actuelle:</Text>
          <Text style={[st.liveVal,{color:d.fuelPressure>=330&&d.fuelPressure<=370?C.green:C.red}]}>
            {d.fuelPressure?d.fuelPressure.toFixed(0)+'kPa':'N/A'}
          </Text>
        </View>
        <View style={st.inputRow}>
          <Text style={st.inputLabel}>Pression cible (kPa):</Text>
          <TextInput style={st.input} value={fuelTarget} onChangeText={setFuelTarget} keyboardType="numeric" placeholderTextColor={C.muted}/>
        </View>
        <View style={{flexDirection:'row',gap:8,marginTop:8}}>
          <Btn label="✓ Appliquer" color={C.accent} onPress={applyFuelPressure} disabled={loading}/>
          <Btn label="🔄 Reset 350kPa" color={C.yellow} onPress={resetFuelPressure} disabled={loading}/>
        </View>
        <View style={st.procedureBox}>
          <Text style={st.procedureTitle}>📋 Procédure de test manomètre:</Text>
          {FUEL_REGULATOR.testProcedure.map((step,i)=>(
            <Text key={i} style={st.procedureStep}>{i+1}. {step}</Text>
          ))}
        </View>
      </View>

      {/* ===== RPM RALENTI ===== */}
      <Text style={st.section}>⚡ FIXATION RPM RALENTI</Text>
      <View style={st.card}>
        <Text style={st.cardInfo}>Valeur constructeur: 750 rpm (±50 rpm) · Moteur chaud sans charge</Text>
        <View style={st.liveRow}>
          <Text style={st.liveLabel}>RPM actuel:</Text>
          <Text style={[st.liveVal,{color:d.rpm>=700&&d.rpm<=850?C.green:C.red}]}>
            {d.rpm?d.rpm.toFixed(0)+' rpm':'N/A'}
          </Text>
        </View>
        <View style={st.inputRow}>
          <Text style={st.inputLabel}>RPM cible:</Text>
          <TextInput style={st.input} value={rpmTarget} onChangeText={setRpmTarget} keyboardType="numeric" placeholderTextColor={C.muted}/>
        </View>
        <View style={{flexDirection:'row',gap:8,marginTop:8}}>
          <Btn label="✓ Appliquer" color={C.accent} onPress={fixRPM} disabled={loading}/>
          <Btn label="🔄 Reset 750rpm" color={C.yellow} onPress={()=>{setRpmTarget('750');fixRPM();}} disabled={loading}/>
        </View>
      </View>

      {/* ===== ADAPTATIONS CARBURANT ===== */}
      <Text style={st.section}>⛽ ADAPTATIONS CARBURANT (LTFT/STFT)</Text>
      <View style={st.card}>
        <View style={st.liveRow}>
          <Text style={st.liveLabel}>LTFT actuel:</Text>
          <Text style={[st.liveVal,{color:Math.abs(d.ltft||0)<=5?C.green:C.red}]}>{d.ltft?d.ltft.toFixed(1)+'%':'N/A'}</Text>
        </View>
        <View style={st.liveRow}>
          <Text style={st.liveLabel}>STFT actuel:</Text>
          <Text style={[st.liveVal,{color:Math.abs(d.stft||0)<=5?C.green:C.red}]}>{d.stft?d.stft.toFixed(1)+'%':'N/A'}</Text>
        </View>
        <Text style={st.cardInfo}>Normal: -5% à +5% · Efface les corrections apprises</Text>
        <Btn label="🔄 Reset adaptations carburant (valeurs constructeur)" color={C.yellow} onPress={resetFuelAdaptations} disabled={loading}/>
      </View>

      {/* ===== RESET COMPLET ===== */}
      <Text style={st.section}>🏭 RESET COMPLET — VALEURS CONSTRUCTEUR</Text>
      <View style={[st.card,{borderColor:C.red+'40'}]}>
        <Text style={{color:C.red,fontSize:13,marginBottom:12,lineHeight:20}}>
          ⚠️ Remet TOUT aux valeurs d'origine constructeur:{'\n'}
          • Injecteurs: offsets IQA = 0{'\n'}
          • Pression carburant: 350 kPa{'\n'}
          • RPM ralenti: 750 rpm{'\n'}
          • Adaptations LTFT/STFT effacées
        </Text>
        <Btn label="🏭 TOUT REMETTRE AUX VALEURS CONSTRUCTEUR" color={C.red} onPress={fullFactoryReset} disabled={loading}/>
      </View>

      {loading && (
        <View style={st.overlay}>
          <ActivityIndicator size="large" color={C.accent}/>
          <Text style={{color:C.accent,marginTop:12,fontSize:14}}>Communication ECM...</Text>
          <Text style={{color:C.muted,fontSize:11,marginTop:4}}>Ne pas couper le contact</Text>
        </View>
      )}

      <View style={{height:30}}/>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container:{flex:1,backgroundColor:'#050810'},
  warn:{backgroundColor:'#ffc80015',borderWidth:1,borderColor:'#ffc80040',borderRadius:8,padding:12,margin:12,alignItems:'center'},
  section:{color:'#00c8ff',fontSize:10,fontFamily:'monospace',letterSpacing:2,textTransform:'uppercase',padding:12,paddingBottom:6},
  card:{backgroundColor:'#0f1520',borderWidth:1,borderColor:'#1a2535',borderRadius:12,padding:14,marginHorizontal:12,marginBottom:14},
  cardInfo:{color:'#3d5570',fontSize:11,fontFamily:'monospace',marginBottom:12,lineHeight:17},
  injRow:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#1a2535'},
  injName:{color:'#b8d0e8',fontSize:13,fontWeight:'600',marginBottom:2},
  injLive:{fontSize:12,fontFamily:'monospace',marginBottom:2},
  injOffset:{color:'#3d5570',fontSize:11,fontFamily:'monospace'},
  injBtns:{flexDirection:'row',alignItems:'center',gap:6},
  injOffsetBig:{color:'#b8d0e8',fontSize:16,fontFamily:'monospace',fontWeight:'700',minWidth:28,textAlign:'center'},
  liveRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},
  liveLabel:{color:'#b8d0e8',fontSize:13},
  liveVal:{fontSize:20,fontWeight:'700',fontFamily:'monospace'},
  inputRow:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:4},
  inputLabel:{color:'#b8d0e8',fontSize:13,flex:1},
  input:{flex:1,backgroundColor:'#0a0e18',borderWidth:1,borderColor:'#1a2535',borderRadius:8,padding:10,color:'#b8d0e8',fontSize:16,fontFamily:'monospace',textAlign:'center'},
  btn:{borderWidth:1,borderRadius:8,paddingVertical:11,paddingHorizontal:14,alignItems:'center'},
  btnTxt:{fontWeight:'700',fontSize:13,letterSpacing:0.5},
  procedureBox:{backgroundColor:'#0a0e18',borderRadius:8,padding:12,marginTop:12},
  procedureTitle:{color:'#00c8ff',fontSize:11,fontWeight:'700',marginBottom:8},
  procedureStep:{color:'#3d5570',fontSize:11,lineHeight:18},
  overlay:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'#050810E0',justifyContent:'center',alignItems:'center'},
});
