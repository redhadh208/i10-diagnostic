import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';

class BluetoothService {
  constructor() {
    this.manager = new BleManager();
    this.device = null;
    this.connected = false;
    this.txCharacteristic = null;
    this.rxCharacteristic = null;
  }

  async initialize() {
    if (Platform.OS === 'android') {
      await this.manager.enable();
    }
    return true;
  }

  async checkPermissions() {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(granted).every(s => s === PermissionsAndroid.RESULTS.GRANTED);
    } catch (e) { return false; }
  }

  async scanDevices() {
    await this.checkPermissions();
    const devices = [];
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.manager.stopDeviceScan();
        resolve(devices);
      }, 8000);

      this.manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          clearTimeout(timeout);
          reject(error);
          return;
        }
        
        const name = (device.name || '').toUpperCase();
        if (name.includes('OBD') || name.includes('ELM') || name.includes('VGATE') || name.includes('VEEPEAK')) {
          const exists = devices.find(d => d.id === device.id);
          if (!exists) {
            devices.push({
              id: device.id,
              name: device.name || 'ELM327',
              address: device.id,
            });
          }
        }
      });
    });
  }

  async connect(deviceId) {
    try {
      this.device = await this.manager.connectToDevice(deviceId);
      await this.device.discoverAllServicesAndCharacteristics();
      
      const services = await this.device.services();
      for (const service of services) {
        const chars = await service.characteristics();
        for (const char of chars) {
          const uuid = char.uuid.toLowerCase();
          if (uuid.includes('1101') || uuid.includes('ffe1')) {
            if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
              this.txCharacteristic = char;
            }
            if (char.isNotifiable || char.isReadable) {
              this.rxCharacteristic = char;
            }
          }
        }
      }

      if (!this.txCharacteristic || !this.rxCharacteristic) {
        throw new Error('Caractéristiques ELM327 non trouvées');
      }

      this.connected = true;
      await this._initELM();
      return this.device;
    } catch (e) {
      this.connected = false;
      throw e;
    }
  }

  async _initELM() {
    const cmds = ['ATZ', 'ATE0', 'ATL0', 'ATH1', 'ATS0', 'ATSP0'];
    for (const cmd of cmds) {
      await this.send(cmd);
      await this._sleep(80);
    }
  }

  async send(cmd) {
    if (!this.connected || !this.txCharacteristic) throw new Error('Non connecté');
    
    return new Promise(async (resolve, reject) => {
      let response = '';
      const timeout = setTimeout(() => {
        this.rxCharacteristic?.removeSubscription();
        resolve(response.trim());
      }, 2000);

      const subscription = this.rxCharacteristic?.monitor((error, char) => {
        if (error) {
          clearTimeout(timeout);
          reject(error);
          return;
        }
        const data = Buffer.from(char.value, 'base64').toString('ascii');
        response += data;
        if (response.includes('>')) {
          clearTimeout(timeout);
          subscription.remove();
          resolve(response.replace(/\r/g, '').replace(/>/g, '').replace(cmd, '').trim());
        }
      });

      const encoded = Buffer.from(cmd + '\r', 'ascii').toString('base64');
      await this.txCharacteristic.writeWithResponse(encoded);
    });
  }

  async readPID(pidCmd) {
    const raw = await this.send(pidCmd);
    if (!raw || raw.includes('NO DATA') || raw.includes('?')) return null;
    try {
      const clean = raw.replace(/\s/g, '').toUpperCase();
      if (!clean.startsWith('41')) return null;
      const hex = clean.substring(4);
      const bytes = [];
      for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
      return this._calc(pidCmd, bytes);
    } catch (e) { return null; }
  }

  _calc(pid, B) {
    switch (pid) {
      case '010C': return ((B[0] * 256) + B[1]) / 4;
      case '0105': return B[0] - 40;
      case '010F': return B[0] - 40;
      case '010B': return B[0];
      case '0111': return (B[0] * 100) / 255;
      case '0114': return B[0] / 200;
      case '0115': return B[0] / 200;
      case '0142': return ((B[0] * 256) + B[1]) / 1000;
      case '0107': return (B[0] - 128) * (100 / 128);
      case '0106': return (B[0] - 128) * (100 / 128);
      case '0104': return (B[0] * 100) / 255;
      case '010D': return B[0];
      case '010E': return (B[0] / 2) - 64;
      case '0110': return ((B[0] * 256) + B[1]) / 100;
      case '010A': return B[0] * 3;
      default: return null;
    }
  }

  async readAllPIDs() {
    const pids = [
      { k: 'rpm', p: '010C' }, { k: 'ect', p: '0105' }, { k: 'iat', p: '010F' },
      { k: 'map', p: '010B' }, { k: 'tps', p: '0111' }, { k: 'o2', p: '0114' },
      { k: 'o2b', p: '0115' }, { k: 'batt', p: '0142' }, { k: 'ltft', p: '0107' },
      { k: 'stft', p: '0106' }, { k: 'load', p: '0104' }, { k: 'speed', p: '010D' },
      { k: 'timing', p: '010E' }, { k: 'maf', p: '0110' }, { k: 'fuelPressure', p: '010A' },
    ];
    const out = {};
    for (const { k, p } of pids) {
      out[k] = await this.readPID(p);
      await this._sleep(40);
    }
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
    const parts = raw.replace(/\s/g, '').match(/.{4}/g) || [];
    for (const p of parts) {
      if (p === '0000') continue;
      const map = { '0': 'P0', '1': 'P1', '2': 'P2', '3': 'P3', '4': 'C0', '5': 'C1', '6': 'C2', '7': 'C3', '8': 'B0', '9': 'B1', 'A': 'B2', 'B': 'B3', 'C': 'U0', 'D': 'U1', 'E': 'U2', 'F': 'U3' };
      codes.push((map[p[0].toUpperCase()] || 'P') + p.substring(1));
    }
    return codes;
  }

  async clearDTC() { return await this.send('04'); }

  async readVIN() { return null; }

  async disconnect() {
    if (this.device) {
      try { await this.device.cancelConnection(); } catch (e) { }
      this.device = null;
      this.connected = false;
    }
  }

  isConnected() { return this.connected && !!this.device; }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

export default new BluetoothService();
