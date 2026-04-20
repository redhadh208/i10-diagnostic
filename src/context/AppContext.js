import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initialState = {
  // Connexion
  isConnected: false,
  connectedDevice: null,

  // Données OBD2 en temps réel (clés lowercase)
  liveData: {
    rpm: 0, ect: 0, iat: 0, map: 0, o2: 0, o2b: 0,
    tps: 0, batt: 0, ltft: 0, stft: 0, load: 0,
    speed: 0, timing: 0, maf: 0, fuelPressure: 0,
    // Injecteurs (correction individuelle IQA)
    inj1: 0, inj2: 0, inj3: 0, inj4: 0,
    // Régulateur pression carburant
    fuelRegPressure: 0, fuelRegTarget: 350,
  },

  // Codes défaut
  dtcCodes: [],

  // ECU info
  ecuInfo: { vin: '', protocol: 'ISO 9141-2', calibrationId: '' },

  // Rapport santé global (généré par scan complet)
  healthReport: null,

  // Configuration
  aiProvider: 'deepseek',    // 'deepseek' | 'gemini'
  deepseekApiKey: null,
  geminiApiKey: null,
  elm327Address: null,
  autoConnect: false,
  refreshRate: 1500,
  language: 'fr',            // 'fr' | 'fr_ar'

  // Adaptations ECU
  codingOptions: {
    idleRpmTarget: 750,
    injOffset1: 0, injOffset2: 0, injOffset3: 0, injOffset4: 0,
    fuelPressureTarget: 350,
    ltftReset: false,
    throttleReset: false,
  },

  ui: { loading: false, error: null, success: null },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CONNECTION':
      return { ...state, isConnected: action.payload, connectedDevice: action.device };
    case 'UPDATE_LIVE':
      return { ...state, liveData: { ...state.liveData, ...action.payload } };
    case 'SET_DTC':
      return { ...state, dtcCodes: action.payload };
    case 'SET_ECU_INFO':
      return { ...state, ecuInfo: { ...state.ecuInfo, ...action.payload } };
    case 'SET_HEALTH_REPORT':
      return { ...state, healthReport: action.payload };
    case 'SET_AI_PROVIDER':
      return { ...state, aiProvider: action.payload };
    case 'SET_DEEPSEEK_KEY':
      return { ...state, deepseekApiKey: action.payload };
    case 'SET_GEMINI_KEY':
      return { ...state, geminiApiKey: action.payload };
    case 'SET_CODING':
      return { ...state, codingOptions: { ...state.codingOptions, ...action.payload } };
    case 'SET_LOADING':
      return { ...state, ui: { ...state.ui, loading: action.payload } };
    case 'SET_ERROR':
      return { ...state, ui: { ...state.ui, error: action.payload, success: null } };
    case 'SET_SUCCESS':
      return { ...state, ui: { ...state.ui, success: action.payload, error: null } };
    case 'CLEAR_UI':
      return { ...state, ui: { loading: false, error: null, success: null } };
    case 'RESTORE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

const AppContext = createContext();

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => { loadPersisted(); }, []);

  const persist = async (key, value) => {
    try { await AsyncStorage.setItem(`@i10pro:${key}`, JSON.stringify(value)); } catch (e) {}
  };

  const loadPersisted = async () => {
    try {
      const keys = ['deepseekApiKey','geminiApiKey','aiProvider','elm327Address','autoConnect','codingOptions','language'];
      const out = {};
      for (const k of keys) {
        const v = await AsyncStorage.getItem(`@i10pro:${k}`);
        if (v !== null) out[k] = JSON.parse(v);
      }
      if (Object.keys(out).length) dispatch({ type: 'RESTORE', payload: out });
    } catch (e) {}
  };

  const actions = {
    setConnection: (ok, device = null) => dispatch({ type: 'SET_CONNECTION', payload: ok, device }),
    updateLive: (data) => dispatch({ type: 'UPDATE_LIVE', payload: data }),
    setDTC: (codes) => dispatch({ type: 'SET_DTC', payload: codes }),
    setEcuInfo: (info) => dispatch({ type: 'SET_ECU_INFO', payload: info }),
    setHealthReport: (report) => dispatch({ type: 'SET_HEALTH_REPORT', payload: report }),
    setAiProvider: (p) => { dispatch({ type: 'SET_AI_PROVIDER', payload: p }); persist('aiProvider', p); },
    setDeepseekKey: (k) => { dispatch({ type: 'SET_DEEPSEEK_KEY', payload: k }); persist('deepseekApiKey', k); },
    setGeminiKey: (k) => { dispatch({ type: 'SET_GEMINI_KEY', payload: k }); persist('geminiApiKey', k); },
    setCoding: (opts) => {
      dispatch({ type: 'SET_CODING', payload: opts });
      persist('codingOptions', { ...state.codingOptions, ...opts });
    },
    setLoading: (v) => dispatch({ type: 'SET_LOADING', payload: v }),
    setError: (msg) => {
      dispatch({ type: 'SET_ERROR', payload: msg });
      setTimeout(() => dispatch({ type: 'CLEAR_UI' }), 5000);
    },
    setSuccess: (msg) => {
      dispatch({ type: 'SET_SUCCESS', payload: msg });
      setTimeout(() => dispatch({ type: 'CLEAR_UI' }), 3000);
    },
  };

  return <AppContext.Provider value={{ state, actions }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
