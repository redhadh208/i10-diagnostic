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

  // ... (tout le reste du code de l'ancienne version)
  // Je vous conseille de copier-coller l'intégralité du contenu de votre ancien BluetoothService.js
  // Si vous ne l'avez plus, dites-le moi et je vous le redonnerai en entier.
}

export default new BluetoothService();
