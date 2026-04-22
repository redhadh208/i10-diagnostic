import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Linking, Switch } from 'react-native';
import { useApp } from '../context/AppContext';

const C = { bg:'#050810',surface:'#0a0e18',panel:'#0f1520',border:'#1a2535',accent:'#00c8ff',accent2:'#ff6020',green:'#00ff88',yellow:'#ffc800',red:'#ff2050',text:'#b8d0e8',muted:'#3d5570' };

const Btn = ({label,color,onPress}) => (
  <TouchableOpacity style={[ss.btn,{borderColor:color}]} onPress={onPress}>
    <Text style={[ss.btnTxt,{color}]}>{label}</Text>
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const { state, actions } = useApp();
  const [dsKey, setDsKey] = useState(state.deepseekApiKey||'');
  const [gmKey, setGmKey] = useState(state.geminiApiKey||'');
  const [showDs, setShowDs] = useState(false);
  const [showGm, setShowGm] = useState(false);

  const mask = (k) => k ? k.slice(0,8)+'••••••••••••'+k.slice(-4) : '';

  const saveDS = () => {
    if (!dsKey.trim()) { Alert.alert('Erreur','Entrez une clé API'); return; }
    actions.setDeepseekKey(dsKey.trim());
    Alert.alert('✅ DeepSeek configuré','IA DeepSeek active dans l\'onglet IA.');
  };

  const saveGM = () => {
    if (!gmKey.trim()) { Alert.alert('Erreur','Entrez une clé API'); return; }
    actions.setGeminiKey(gmKey.trim());
    Alert.alert('✅ Gemini configuré','IA Gemini active dans l\'onglet IA.');
  };

  return (
    <ScrollView style={{flex:1,backgroundColor:C.bg}}>

      {/* ===== FOURNISSEUR IA ===== */}
      <View style={ss.card}>
        <Text style={ss.title}>🤖 FOURNISSEUR IA ACTIF</Text>
        <View style={{flexDirection:'row',gap:8}}>
          {['deepseek','gemini'].map(p=>(
            <TouchableOpacity key={p} style={[ss.provBtn, state.aiProvider===p&&ss.provBtnActive]} onPress={()=>actions.setAiProvider(p)}>
              <Text style={[ss.provTxt, state.aiProvider===p&&{color:C.accent}]}>
                {p==='deepseek'?'🔵 DeepSeek':'♊ Gemini'}
              </Text>
              {state.aiProvider===p&&<Text style={{color:C.green,fontSize:10}}>✓ Actif</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ===== DEEPSEEK ===== */}
      <View style={ss.card}>
        <Text style={ss.title}>🔵 CLÉ API DEEPSEEK</Text>
        <View style={[ss.statusRow,{borderColor:state.deepseekApiKey?C.green+'60':C.muted+'40',backgroundColor:state.deepseekApiKey?C.green+'10':'transparent'}]}>
          <Text style={{color:state.deepseekApiKey?C.green:C.muted,fontSize:13,fontWeight:'600'}}>
            {state.deepseekApiKey?'✅ DeepSeek configuré':'⚠️ Non configuré'}
          </Text>
        </View>
        <Text style={ss.hint}>
          {'Obtenez votre clé sur '}
          <Text style={{color:C.accent}} onPress={()=>Linking.openURL('https://platform.deepseek.com/api_keys')}>platform.deepseek.com</Text>
          {'\n1. Créez un compte\n2. API Keys → Create\n3. Copiez la clé (sk-...)'}
        </Text>
        <View style={{position:'relative',marginBottom:8}}>
          <TextInput style={ss.input} value={showDs?dsKey:(state.deepseekApiKey?mask(state.deepseekApiKey):dsKey)}
            onChangeText={setDsKey} placeholder="sk-..." placeholderTextColor={C.muted}
            autoCapitalize="none" autoCorrect={false} editable={showDs||!state.deepseekApiKey}/>
          <TouchableOpacity style={ss.eye} onPress={()=>setShowDs(!showDs)}>
            <Text style={{fontSize:18}}>{showDs?'🙈':'👁️'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{flexDirection:'row',gap:8}}>
          <Btn label="💾 Sauvegarder" color={C.accent} onPress={saveDS}/>
          {state.deepseekApiKey&&<Btn label="🗑 Supprimer" color={C.red} onPress={()=>{actions.setDeepseekKey(null);setDsKey('');}}/>}
        </View>
      </View>

      {/* ===== GEMINI ===== */}
      <View style={ss.card}>
        <Text style={ss.title}>♊ CLÉ API GEMINI (GOOGLE)</Text>
        <View style={[ss.statusRow,{borderColor:state.geminiApiKey?C.green+'60':C.muted+'40',backgroundColor:state.geminiApiKey?C.green+'10':'transparent'}]}>
          <Text style={{color:state.geminiApiKey?C.green:C.muted,fontSize:13,fontWeight:'600'}}>
            {state.geminiApiKey?'✅ Gemini configuré':'⚠️ Non configuré'}
          </Text>
        </View>
        <Text style={ss.hint}>
          {'Obtenez votre clé sur '}
          <Text style={{color:C.accent}} onPress={()=>Linking.openURL('https://aistudio.google.com/app/apikey')}>aistudio.google.com</Text>
          {'\n1. Connectez-vous avec Google\n2. Create API Key\n3. Copiez la clé (AIza...)'}
        </Text>
        <View style={{position:'relative',marginBottom:8}}>
          <TextInput style={ss.input} value={showGm?gmKey:(state.geminiApiKey?mask(state.geminiApiKey):gmKey)}
            onChangeText={setGmKey} placeholder="AIzaSy..." placeholderTextColor={C.muted}
            autoCapitalize="none" autoCorrect={false} editable={showGm||!state.geminiApiKey}/>
          <TouchableOpacity style={ss.eye} onPress={()=>setShowGm(!showGm)}>
            <Text style={{fontSize:18}}>{showGm?'🙈':'👁️'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{flexDirection:'row',gap:8}}>
          <Btn label="💾 Sauvegarder" color={C.accent} onPress={saveGM}/>
          {state.geminiApiKey&&<Btn label="🗑 Supprimer" color={C.red} onPress={()=>{actions.setGeminiKey(null);setGmKey('');}}/>}
        </View>
      </View>

      {/* ===== PRÉFÉRENCES ===== */}
      <View style={ss.card}>
        <Text style={ss.title}>⚙️ PRÉFÉRENCES</Text>
        <View style={ss.pref}>
          <Text style={ss.prefLbl}>Auto-connexion ELM327</Text>
          <Switch value={state.autoConnect||false} onValueChange={v=>actions.setCoding({autoConnect:v})}
            trackColor={{false:C.border,true:C.accent}} thumbColor={state.autoConnect?C.green:C.muted}/>
        </View>
      </View>

      {/* ===== RÉFÉRENCE RAPIDE ===== */}
      <View style={ss.card}>
        <Text style={ss.title}>📊 RÉFÉRENCE CONSTRUCTEUR G4HG</Text>
        {[
          ['T_MAP (IG ON repos)','3.8 ~ 4.2 V'],['IAT à 20°C','3.3 ~ 3.7 V'],
          ['ECT à 80°C','1.25 ±0.3 V / 0.30 kΩ'],['O2 Zirconie (chaud)','0.2 ~ 0.8 V oscillant'],
          ['TPS fermé / plein','0.5 V / 4.5 V'],['RPM ralenti chaud','700 ~ 850 rpm'],
          ['Batterie (en marche)','13.5 ~ 14.5 V'],['LTFT/STFT normal','-5% ~ +5%'],
          ['Pression carburant','330 ~ 370 kPa'],['Injecteurs résistance','12 ~ 16 Ω'],
          ['Injecteurs débit','152 cc/min'],['Injecteurs temps ralenti','2.0 ~ 3.5 ms'],
          ['Thermostat ouverture','82°C → plein 95°C'],['ISA fréquence','250 Hz'],
          ['Bobine primaire','0.82 Ω ±10%'],['Bobine secondaire','15.5 kΩ ±10%'],
          ['Compression','11 ~ 13 bar par cylindre'],
        ].map(([l,v],i)=>(
          <View key={i} style={[ss.ref,i%2===0&&{backgroundColor:C.surface+'80',borderRadius:4}]}>
            <Text style={ss.refL}>{l}</Text>
            <Text style={ss.refV}>{v}</Text>
          </View>
        ))}
      </View>

      {/* À propos */}
      <View style={ss.card}>
        <Text style={ss.title}>ℹ️ À PROPOS</Text>
        <Text style={{color:C.muted,fontSize:12,lineHeight:20}}>
          {'i10 Diag Pro v2.0\nHyundai i10 2008 — G4HG 1.1L — Bosch M7.9.8\n\nIA: DeepSeek / Gemini (au choix)\nOBD2: ELM327 Bluetooth\n\n⚠️ Usage personnel uniquement.'}
        </Text>
      </View>

      <View style={{height:30}}/>
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  card:{backgroundColor:'#0f1520',margin:12,marginBottom:0,marginTop:12,padding:16,borderRadius:12,borderWidth:1,borderColor:'#1a2535'},
  title:{color:'#00c8ff',fontSize:11,fontWeight:'700',letterSpacing:2,textTransform:'uppercase',fontFamily:'monospace',marginBottom:12},
  statusRow:{borderWidth:1,borderRadius:8,padding:10,marginBottom:12},
  hint:{color:'#3d5570',fontSize:12,lineHeight:20,marginBottom:12},
  input:{backgroundColor:'#0a0e18',borderWidth:1,borderColor:'#1a2535',borderRadius:8,padding:12,color:'#b8d0e8',fontSize:13,fontFamily:'monospace',paddingRight:50},
  eye:{position:'absolute',right:10,top:12},
  btn:{borderWidth:1,borderRadius:8,padding:12,alignItems:'center',flex:1},
  btnTxt:{fontWeight:'700',fontSize:13},
  provBtn:{flex:1,backgroundColor:'#0a0e18',borderRadius:8,borderWidth:1,borderColor:'#1a2535',padding:12,alignItems:'center',gap:4},
  provBtnActive:{borderColor:'#00c8ff',backgroundColor:'#00c8ff10'},
  provTxt:{color:'#3d5570',fontSize:13,fontWeight:'600'},
  pref:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  prefLbl:{color:'#b8d0e8',fontSize:14},
  ref:{flexDirection:'row',justifyContent:'space-between',paddingVertical:6,paddingHorizontal:4},
  refL:{color:'#3d5570',fontSize:11,flex:1},
  refV:{color:'#00ff88',fontSize:11,fontFamily:'monospace',fontWeight:'700'},
});
