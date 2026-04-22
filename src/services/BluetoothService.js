import { Platform, PermissionsAndroid } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

class BluetoothService {
  constructor() {
    this.device = null;
    this.connected = false;
  }

  async initialize() {
    try {
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) await RNBluetoothClassic.requestBluetoothEnabled();
      return true;
    } catch (e) { throw e; }
  }

  async checkPermissions() {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(granted).every(s => s === PermissionsAndroid.RESULTS.GRANTED);
    } catch (e) { return false; }
  }

  async scanDevices() {
    await this.checkPermissions();
    const paired = await RNBluetoothClassic.getBondedDevices();
    let discovered = [];
    try {
      discovered = await RNBluetoothClassic.startDiscovery();
      await RNBluetoothClassic.cancelDiscovery();
    } catch (e) {}
    const all = [...paired, ...discovered];
    const seen = new Set();
    return all.filter(d => { if (seen.has(d.address)) return false; seen.add(d.address); return true; });
  }

  async connect(address) {
    this.device = await RNBluetoothClassic.connectToDevice(address, { delimiter: '\r', charset: 'ASCII' });
    this.connected = true;
    await this._initELM();
    return this.device;
  }

  async _initELM() {
    for (const cmd of ['ATZ','ATE0','ATL0','ATH1','ATS0','ATSP0','ATAT1','ATST32']) {
      await this.send(cmd);
      await this._sleep(60);
    }
  }

  async send(cmd) {
    if (!this.connected || !this.device) throw new Error('Non connecté');
    try {
      await this.device.write(cmd + '\r');
      await this._sleep(120);
      let data = '', tries = 0;
      while (tries < 6) {
        const avail = await this.device.available();
        if (avail > 0) { data += await this.device.read(); if (data.includes('>')) break; }
        await this._sleep(60);
        tries++;
      }
      return data.replace(/\r/g,'').replace(/>/g,'').replace(cmd,'').trim();
    } catch (e) { return null; }
  }

  async readPID(pidCmd) {
    const raw = await this.send(pidCmd);
    if (!raw || raw.includes('NO DATA') || raw.includes('?')) return null;
    try {
      const clean = raw.replace(/\s/g,'').toUpperCase();
      if (!clean.startsWith('41')) return null;
      const hex = clean.substring(4);
      const bytes = [];
      for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i,2),16));
      return this._calc(pidCmd, bytes);
    } catch (e) { return null; }
  }

  _calc(pid, B) {
    switch(pid) {
      case '010C': return ((B[0]*256)+B[1])/4;
      case '0105': return B[0]-40;
      case '010F': return B[0]-40;
      case '010B': return B[0];
      case '0111': return (B[0]*100)/255;
      case '0114': return B[0]/200;
      case '0115': return B[0]/200;
      case '0142': return ((B[0]*256)+B[1])/1000;
      case '0107': return (B[0]-128)*(100/128);
      case '0106': return (B[0]-128)*(100/128);
      case '0104': return (B[0]*100)/255;
      case '010D': return B[0];
      case '010E': return (B[0]/2)-64;
      case '0110': return ((B[0]*256)+B[1])/100;
      case '010A': return B[0]*3;
      default: return null;
    }
  }

  async readAllPIDs() {
    const pids = [
      {k:'rpm',p:'010C'},{k:'ect',p:'0105'},{k:'iat',p:'010F'},
      {k:'map',p:'010B'},{k:'tps',p:'0111'},{k:'o2',p:'0114'},
      {k:'o2b',p:'0115'},{k:'batt',p:'0142'},{k:'ltft',p:'0107'},
      {k:'stft',p:'0106'},{k:'load',p:'0104'},{k:'speed',p:'010D'},
      {k:'timing',p:'010E'},{k:'maf',p:'0110'},{k:'fuelPressure',p:'010A'},
    ];
    const out = {};
    for (const {k,p} of pids) { out[k] = await this.readPID(p); await this._sleep(40); }
    return out;
  }

  async readInjectorTimes() {
    const out = { inj1: null, inj2: null, inj3: null, inj4: null };
    return out;
  }

  async readDTC() {
    const raw = await this.send('03');
    if (!raw || raw.includes('NO DATA')) return [];
    const codes = [];
    const parts = raw.replace(/\s/g,'').match(/.{4}/g) || [];
    for (const p of parts) {
      if (p === '0000') continue;
      const map = {'0':'P0','1':'P1','2':'P2','3':'P3','4':'C0','5':'C1','6':'C2','7':'C3','8':'B0','9':'B1','A':'B2','B':'B3','C':'U0','D':'U1','E':'U2','F':'U3'};
      codes.push((map[p[0].toUpperCase()] || 'P') + p.substring(1));
    }
    return codes;
  }

  async clearDTC() { return await this.send('04'); }

  async readVIN() {
    const raw = await this.send('0902');
    if (!raw) return null;
    try {
      let vin = '';
      const clean = raw.replace(/\s/g,'');
      for (let i=6; i<clean.length; i+=2) {
        const b = parseInt(clean.substr(i,2),16);
        if (b > 0) vin += String.fromCharCode(b);
      }
      return vin || null;
    } catch (e) { return null; }
  }

  async disconnect() {
    if (this.device) {
      try { await this.device.write('ATZ\r'); await this._sleep(200); await this.device.disconnect(); } catch (e) {}
      this.device = null; this.connected = false;
    }
  }

  isConnected() { return this.connected && !!this.device; }
  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

export default new BluetoothService();
