import BluetoothService from './BluetoothService';
import { SENSOR_REF, DTC_DB } from '../utils/sensorReference';

class OBDService {
  constructor() { this.interval = null; }

  async connect(address) { return await BluetoothService.connect(address); }

  startReading(callback, rate = 1500) {
    this.stopReading();
    const run = async () => {
      if (!BluetoothService.isConnected()) { this.stopReading(); return; }
      try {
        const base = await BluetoothService.readAllPIDs();
        const inj  = await BluetoothService.readInjectorTimes();
        const data = this._validate({ ...base, ...inj });
        callback(data);
      } catch (e) {}
    };
    run();
    this.interval = setInterval(run, rate);
  }

  stopReading() {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }

  _validate(raw) {
    const limits = {
      rpm:{min:0,max:8000}, ect:{min:-40,max:215}, iat:{min:-40,max:215},
      map:{min:0,max:255}, tps:{min:0,max:100}, o2:{min:0,max:1.5},
      o2b:{min:0,max:1.5}, batt:{min:0,max:20}, ltft:{min:-100,max:100},
      stft:{min:-100,max:100}, load:{min:0,max:100}, speed:{min:0,max:255},
      fuelPressure:{min:0,max:800}, inj1:{min:0,max:20}, inj2:{min:0,max:20},
      inj3:{min:0,max:20}, inj4:{min:0,max:20},
    };
    const out = {};
    for (const [k,v] of Object.entries(raw)) {
      const lim = limits[k];
      out[k] = (v !== null && v !== undefined && !isNaN(v) && (!lim || (v >= lim.min && v <= lim.max))) ? v : 0;
    }
    return out;
  }

  // Génère un rapport de santé complet de tous les capteurs
  async generateHealthReport(liveData) {
    const issues = [], ok = [], warnings = [];

    const check = (key, value, label, min, max, unit) => {
      if (value === 0 || value === null) {
        warnings.push({ sensor: label, status:'NO_DATA', msg:'Aucune donnée reçue', value:'N/A', unit });
      } else if (value < min || value > max) {
        issues.push({ sensor: label, status:'FAIL', value: value.toFixed(2), unit, min, max,
          msg: value < min ? `Trop bas (< ${min}${unit})` : `Trop haut (> ${max}${unit})` });
      } else {
        ok.push({ sensor: label, status:'OK', value: value.toFixed(2), unit });
      }
    };

    const d = liveData;
    check('RPM',   d.rpm,         'RPM ralenti',         700, 900,  'rpm');
    check('ECT',   d.ect,         'Temp. liquide',       70,  100,  '°C');
    check('IAT',   d.iat,         'Temp. air',           -20, 60,   '°C');
    check('MAP',   d.map,         'Pression admission',  20,  110,  'kPa');
    check('O2',    d.o2,          'O2 amont',            0.2, 0.8,  'V');
    check('O2B',   d.o2b,         'O2 aval',             0.2, 0.8,  'V');
    check('TPS',   d.tps,         'Position papillon',   0,   100,  '%');
    check('BATT',  d.batt,        'Tension batterie',    13.5,14.5, 'V');
    check('LTFT',  d.ltft,        'Correction LT carbu.',-5,  5,    '%');
    check('STFT',  d.stft,        'Correction CT carbu.',-5,  5,    '%');
    check('LOAD',  d.load,        'Charge moteur',       10,  50,   '%');
    check('FUEL',  d.fuelPressure,'Pression carburant',  300, 400,  'kPa');

    // Analyse des injecteurs
    const injVals = [d.inj1, d.inj2, d.inj3, d.inj4].filter(v => v > 0);
    if (injVals.length > 0) {
      const avg = injVals.reduce((a,b) => a+b, 0) / injVals.length;
      [d.inj1, d.inj2, d.inj3, d.inj4].forEach((v, i) => {
        if (!v) { warnings.push({ sensor:`Injecteur ${i+1}`, status:'NO_DATA', msg:'Non lu', value:'N/A', unit:'ms' }); return; }
        const diff = Math.abs(v - avg);
        if (v < 2.0 || v > 3.5) {
          issues.push({ sensor:`Injecteur ${i+1}`, status:'FAIL', value:v.toFixed(2), unit:'ms',
            msg:`Temps d'ouverture anormal (2.0-3.5ms attendu)` });
        } else if (diff > 1.5) {
          issues.push({ sensor:`Injecteur ${i+1}`, status:'FAIL', value:v.toFixed(2), unit:'ms',
            msg:`Déséquilibre: écart ${diff.toFixed(2)}ms vs moyenne ${avg.toFixed(2)}ms` });
        } else { ok.push({ sensor:`Injecteur ${i+1}`, status:'OK', value:v.toFixed(2), unit:'ms' }); }
      });
    }

    const overall = issues.length > 3 ? 'critical' : issues.length > 0 ? 'warning' : 'ok';
    return {
      timestamp: new Date().toLocaleString('fr-FR'),
      overall, issues, warnings, ok,
      summary: `${ok.length} OK · ${warnings.length} avertissements · ${issues.length} problèmes`,
      score: Math.round((ok.length / (ok.length + issues.length + warnings.length)) * 100) || 0,
    };
  }

  async readDTC() {
    const raw = await BluetoothService.readDTC();
    return raw.map(code => ({ code, ...DTC_DB[code], known: !!DTC_DB[code] }));
  }

  async clearDTC() { return await BluetoothService.clearDTC(); }
  async readVIN()  { return await BluetoothService.readVIN(); }

  async resetFuelAdaptations() {
    await BluetoothService.send('ATSH7E0'); await BluetoothService._sleep?.(50);
    const r = await BluetoothService.send('04');
    return r && !r.includes('?');
  }

  async writeAdaptation(cmd, value) {
    await BluetoothService.send('ATSH7E0');
    await new Promise(r => setTimeout(r, 50));
    const hex = Math.round(value).toString(16).padStart(4,'0').toUpperCase();
    const resp = await BluetoothService.send(cmd + hex);
    return resp && !resp.includes('7F');
  }

  async disconnect() { this.stopReading(); await BluetoothService.disconnect(); }
  isConnected()      { return BluetoothService.isConnected(); }
}

export default new OBDService();
