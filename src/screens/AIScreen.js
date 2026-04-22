import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useApp } from '../context/AppContext';
import { sendToAI, localFallback, QUICK_PROMPTS } from '../services/AIService';

const C = { bg:'#050810',surface:'#0a0e18',panel:'#0f1520',border:'#1a2535',accent:'#00c8ff',accent2:'#ff6020',green:'#00ff88',yellow:'#ffc800',red:'#ff2050',text:'#b8d0e8',muted:'#3d5570' };

export default function AIScreen({ route }) {
  const { state } = useApp();
  const [messages, setMessages] = useState([{
    id:'0', role:'assistant',
    content:`🤖 Assistant IA Diagnostic G4HG\n\nBonjour ! Je suis connecté à ${state.aiProvider === 'deepseek' ? '🔵 DeepSeek' : '♊ Gemini'}.\n\nJe connais toutes les valeurs constructeur du G4HG et je vois vos données OBD2 en temps réel.\n\nJe peux vous aider avec:\n• 💉 Correction et équilibrage des injecteurs\n• ⛽ Régulateur pression carburant\n• 🔄 Reset valeurs constructeur\n• 📊 Analyse surconsommation\n• ⚡ Fixation RPM ralenti\n• 🔬 Diagnostic sonde O2\n• 🔌 Parasites électriques\n\n${!state.deepseekApiKey && !state.geminiApiKey ? '⚠️ Clé API non configurée — mode local actif\nAllez dans Réglages pour configurer DeepSeek ou Gemini.' : '✅ IA active — posez votre question !'}`,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (route?.params?.autoAnalyze) {
      setTimeout(() => send('Analyse complète de mes données OBD2 actuelles. Identifie toutes les anomalies et donne un plan de correction prioritaire avec les valeurs constructeur à atteindre.'), 700);
    }
  }, []);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { id: Date.now().toString(), role:'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.filter(m=>m.id!=='0').slice(-8).map(m=>({role:m.role,content:m.content}));

      let reply;
      const hasKey = state.aiProvider==='deepseek' ? !!state.deepseekApiKey : !!state.geminiApiKey;

      if (hasKey) {
        const result = await sendToAI({
          provider: state.aiProvider,
          deepseekApiKey: state.deepseekApiKey,
          geminiApiKey: state.geminiApiKey,
          messages: [...history, {role:'user',content:msg}],
          liveData: state.liveData,
        });
        reply = result.success ? result.text : `❌ Erreur: ${result.error}\n\n---\n${localFallback(msg, state.liveData)}`;
      } else {
        await new Promise(r => setTimeout(r, 600));
        reply = localFallback(msg, state.liveData);
      }

      setMessages(prev => [...prev, {id:(Date.now()+1).toString(), role:'assistant', content: reply}]);
    } catch(e) {
      setMessages(prev => [...prev, {id:(Date.now()+1).toString(), role:'assistant', content:`❌ Erreur: ${e.message}`, isError:true}]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({animated:true}), 100);
    }
  };

  const renderMsg = ({item}) => (
    <View style={[s.msgWrap, item.role==='user' && s.msgUser]}>
      <Text style={s.msgRole}>{item.role==='user'?'👤 VOUS':`🤖 IA ${state.aiProvider.toUpperCase()}`}</Text>
      <View style={[s.bubble, item.role==='user'?s.bubbleUser:s.bubbleAI, item.isError&&s.bubbleErr]}>
        <Text style={[s.bubbleTxt, item.isError&&{color:C.red}]}>{item.content}</Text>
      </View>
    </View>
  );

  const providerBadge = state.aiProvider==='deepseek' ? '🔵 DeepSeek' : '♊ Gemini';
  const hasKey = state.aiProvider==='deepseek' ? !!state.deepseekApiKey : !!state.geminiApiKey;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={90}>
      {/* Provider badge */}
      <View style={s.providerBar}>
        <Text style={s.providerTxt}>{providerBadge} — {hasKey?'✅ IA Active':'⚠️ Mode local'}</Text>
        {!hasKey && <Text style={s.providerHint}>Configurer dans Réglages</Text>}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMsg}
        keyExtractor={i=>i.id}
        contentContainerStyle={s.list}
        onContentSizeChange={()=>listRef.current?.scrollToEnd({animated:false})}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickScroll} contentContainerStyle={{paddingRight:12,gap:8}}>
            {QUICK_PROMPTS.map((p,i)=>(
              <TouchableOpacity key={i} style={s.quickBtn} onPress={()=>send(p.q)} disabled={loading}>
                <Text style={s.quickTxt}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        }
        ListFooterComponent={loading?(
          <View style={[s.msgWrap]}>
            <Text style={s.msgRole}>{`🤖 IA ${state.aiProvider.toUpperCase()}`}</Text>
            <View style={[s.bubble,s.bubbleAI]}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                <ActivityIndicator size="small" color={C.accent2}/>
                <Text style={{color:C.muted,fontSize:13}}>Analyse en cours...</Text>
              </View>
            </View>
          </View>
        ):null}
      />

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Posez votre question sur le G4HG..."
          placeholderTextColor={C.muted}
          multiline
          maxLength={600}
          editable={!loading}
        />
        <TouchableOpacity style={[s.sendBtn,(!input.trim()||loading)&&{opacity:0.4}]} onPress={()=>send()} disabled={!input.trim()||loading}>
          {loading?<ActivityIndicator size="small" color="#000"/>:<Text style={s.sendTxt}>▶</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#050810'},
  providerBar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:10,backgroundColor:'#0a0e18',borderBottomWidth:1,borderBottomColor:'#1a2535'},
  providerTxt:{color:'#b8d0e8',fontSize:12,fontWeight:'600'},
  providerHint:{color:'#ffc800',fontSize:11},
  list:{padding:12,paddingBottom:16},
  quickScroll:{marginBottom:10},
  quickBtn:{backgroundColor:'#0f1520',borderWidth:1,borderColor:'#1a2535',borderRadius:20,paddingHorizontal:14,paddingVertical:7,marginRight:8},
  quickTxt:{color:'#b8d0e8',fontSize:12},
  msgWrap:{marginBottom:14,maxWidth:'88%'},
  msgUser:{alignSelf:'flex-end'},
  msgRole:{color:'#3d5570',fontSize:9,fontFamily:'monospace',textTransform:'uppercase',letterSpacing:1,marginBottom:4},
  bubble:{padding:12,borderRadius:12,borderWidth:1},
  bubbleAI:{backgroundColor:'#0f1520',borderColor:'#ff602040',borderTopLeftRadius:3},
  bubbleUser:{backgroundColor:'#00c8ff10',borderColor:'#00c8ff40',borderTopRightRadius:3},
  bubbleErr:{borderColor:'#ff205050',backgroundColor:'#ff205008'},
  bubbleTxt:{color:'#b8d0e8',fontSize:13,lineHeight:21},
  inputRow:{flexDirection:'row',padding:12,backgroundColor:'#0a0e18',borderTopWidth:1,borderTopColor:'#1a2535',gap:8},
  input:{flex:1,backgroundColor:'#0f1520',borderWidth:1,borderColor:'#1a2535',borderRadius:20,paddingHorizontal:16,paddingVertical:10,color:'#b8d0e8',fontSize:14,maxHeight:100},
  sendBtn:{width:48,height:48,borderRadius:24,backgroundColor:'#ff6020',justifyContent:'center',alignItems:'center'},
  sendTxt:{color:'#000',fontSize:18,fontWeight:'700'},
});
