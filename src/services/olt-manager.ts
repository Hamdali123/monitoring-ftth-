import snmp, { Session } from 'net-snmp';
import prisma from '../db/prisma.js';

// OIDs for ZTE (C300/C600) - Multiple candidates untuk berbagai versi firmware
const ZTE_SN_OID_CANDIDATES = [
  '1.3.6.1.4.1.3902.1012.3.28.1.1.5',  // zxGponOntSn (standar)
  '1.3.6.1.4.1.3902.1082.3.28.1.1.5',  // Versi firmware baru C600-V5
  '1.3.6.1.4.1.3902.1015.1010.2.1.1.5', // Alternatif OID path
  '1.3.6.1.4.1.3902.1012.3.28.1.1.1',  // zxGponOntRegistrationId
];

const ZTE_OIDS = {
  sn: '1.3.6.1.4.1.3902.1012.3.28.1.1.5',         // zxGponOntSn
  desc: '1.3.6.1.4.1.3902.1012.3.28.1.1.2',       // zxGponOntDescription
  signal: '1.3.6.1.4.1.3902.1012.3.50.12.1.1.10', // zxAnPonRxOpticalPowerTable (GPON)
  status: '1.3.6.1.4.1.3902.1012.3.28.2.1.1',     // zxGponOntStatus
  phase: '1.3.6.1.4.1.3902.1012.3.28.2.1.4',      // zxGponOntPhaseState (1: online, 2: offline)
  ip: '1.3.6.1.4.1.3902.1015.1010.5.9.1.1',
};

// OIDs for HIOSO/Generic (EPON)
const HIOSO_OIDS = {
  sn: '1.3.6.1.4.1.3320.101.10.1.1.3',      // MAC address
  desc: '1.3.6.1.4.1.3320.101.10.1.1.2',     // Description/Name
  signal: '1.3.6.1.4.1.3320.101.10.5.1.5',  // RX Power
  status: '1.3.6.1.4.1.3320.101.10.1.1.26', // Online status
  ip: '1.3.6.1.4.1.3320.101.10.1.1.2',
};

/**
 * Helper to perform SNMP Walk and return a map of Index -> Value
 */
async function walkSnmp(session: Session, oid: string): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const results: Record<string, any> = {};
    session.subtree(oid, (varbinds) => {
      for (const vb of varbinds) {
        if (snmp.isVarbindError(vb)) {
          // Ignore: bisa berarti OID tidak ada di device ini
        } else {
          const fullOid = vb.oid;
          const index = fullOid.split(oid + '.')[1] || fullOid.split(oid)[1]?.substring(1);
          if (index) results[index] = vb.value;
        }
      }
    }, (error) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
}

/**
 * Coba berbagai OID untuk ZTE SN sampai ada yang return data
 */
async function findWorkingSnOid(session: Session, candidates: string[]): Promise<{ oid: string; data: Record<string, any> }> {
  let isTimeout = false;
  let lastError;
  for (const oid of candidates) {
    try {
      const data = await walkSnmp(session, oid);
      if (Object.keys(data).length > 0) {
        console.log(`[SNMP] Found working SN OID: ${oid} (${Object.keys(data).length} ONUs)`);
        return { oid, data };
      }
      console.log(`[SNMP] OID ${oid} returned 0 results, trying next...`);
    } catch (e: any) {
      console.log(`[SNMP] OID ${oid} error: ${e.message}, trying next...`);
      lastError = e;
      if (e.message && (e.message.includes('RequestTimedOut') || e.message.includes('Timeout'))) {
        isTimeout = true;
        break; // Stop trying if device is offline
      }
    }
  }
  if (isTimeout && lastError) {
    throw lastError; // Bubble up timeout to throw as Offline
  }
  console.warn(`[SNMP] No working SN OID found after trying ${candidates.length} candidates.`);
  return { oid: candidates[0], data: {} };
}

/**
 * Discovers the mapping between ONU Serial Number (SN/MAC) and SNMP Index
 */
export async function fetchOnuIndexMap(session: Session, type: 'ZTE' | 'HIOSO'): Promise<Record<string, string>> {
  let rawMap: Record<string, any>;

  if (type === 'ZTE') {
    // Coba berbagai OID untuk ZTE
    const { data } = await findWorkingSnOid(session, ZTE_SN_OID_CANDIDATES);
    rawMap = data;
  } else {
    rawMap = await walkSnmp(session, HIOSO_OIDS.sn);
  }

  const indexMap: Record<string, string> = {};

  for (const [index, value] of Object.entries(rawMap)) {
    let snStr = '';
    if (Buffer.isBuffer(value)) {
      if (type === 'ZTE' && value.length >= 8) {
         const prefixArr = Array.from(value.slice(0, 4));
         const isAscii = prefixArr.every(c => c >= 32 && c <= 126);
         
         if (isAscii) {
           const prefix = value.slice(0, 4).toString('ascii');
           const hex = value.slice(4).toString('hex').toUpperCase();
           snStr = prefix + hex;
         } else {
           snStr = value.toString('hex').toUpperCase();
         }
      } else {
         snStr = value.toString('hex').toUpperCase();
      }
    } else {
      snStr = String(value).toUpperCase();
    }
    if (snStr) indexMap[snStr] = index;
  }

  return indexMap;
}

export async function pollOltAdvanced(oltId: string) {
  const olt = await prisma.olt.findUnique({ 
    where: { id: oltId },
    include: { customers: true }
  });
  
  if (!olt) throw new Error('OLT not found');

  const oids = olt.type === 'ZTE' ? ZTE_OIDS : HIOSO_OIDS;
  const snmpVersion = olt.snmp_version === 'v2c' ? snmp.Version2c : snmp.Version1;
  const snmpPort = (olt as any).snmp_port || 2162;
  const session = snmp.createSession(olt.ip_address, olt.snmp_community, {
    version: snmpVersion,
    port: snmpPort,
    timeout: 10000,
    retries: 1
  });

  try {
    console.log(`[SNMP] Discovering ONU indices for ${olt.name} (port: ${snmpPort})...`);
    let indexMap;
    try {
      indexMap = await fetchOnuIndexMap(session, olt.type as 'ZTE' | 'HIOSO');
    } catch (error: any) {
      if (error.message?.includes('RequestTimedOut') || error.message?.includes('Timeout')) {
        throw new Error(`Perangkat fisik OLT (${olt.name}) belum terkoneksi atau offline. Harap pastikan perangkat fisik OLT sudah menyala dan terhubung.`);
      }
      throw error;
    }
    const results = [];

    for (const customer of olt.customers) {
      try {
        const index = indexMap[customer.sn_mac.toUpperCase()];
        if (!index) {
          console.warn(`[SNMP] Index not found for ONU ${customer.sn_mac} (${customer.name})`);
          continue;
        }

        const varbinds = await new Promise<any[]>((resolve, reject) => {
          const fetchOids = [oids.signal + "." + index, oids.status + "." + index];
          if (olt.type === 'ZTE') fetchOids.push(ZTE_OIDS.phase + "." + index);
          
          session.get(fetchOids, (error, vbs) => {
            if (error) reject(error);
            else resolve(vbs || []);
          });
        });

        const signalVar = varbinds[0];
        const statusVar = varbinds[1];
        const phaseVar = olt.type === 'ZTE' ? varbinds[2] : null;

        let rxPower = (signalVar && !snmp.isVarbindError(signalVar)) ? signalVar.value : null;
        
        if (typeof rxPower === 'number' && rxPower !== 0) {
           if (olt.type === 'ZTE') {
             rxPower = (rxPower * 0.002) - 30;
           } else if (olt.type === 'HIOSO') {
             rxPower = rxPower > 1000 ? (rxPower - 65536) / 10 : rxPower / 10;
           }
        }

        const statusVal = (statusVar && !snmp.isVarbindError(statusVar)) ? statusVar.value : 0;
        const phaseVal = (phaseVar && !snmp.isVarbindError(phaseVar)) ? phaseVar.value : null;

        let finalStatus: 'ONLINE' | 'LOS' | 'OFFLINE' = 'OFFLINE';
        
        if (olt.type === 'ZTE') {
          if (phaseVal === 1 || phaseVal === 5) finalStatus = 'ONLINE';
          else if (phaseVal === 2) finalStatus = 'OFFLINE';
          else if (statusVal === 2) finalStatus = 'LOS';
        } else {
          if (statusVal === 3 || statusVal === 1) finalStatus = 'ONLINE';
          else if (statusVal === 4) finalStatus = 'LOS';
        }

        results.push({
          customer_id: customer.id,
          rx_live: (typeof rxPower === 'number' && rxPower < 0) ? parseFloat(rxPower.toFixed(2)) : -40,
          status: finalStatus,
          modem_ip: null
        });

      } catch (err) {
        console.error(`[SNMP] Error polling customer ${customer.name}:`, err);
      }
    }

    return results;
  } finally {
    session.close();
  }
}

export async function checkFiberCut(oltId: string) {
  const metrics = await pollOltAdvanced(oltId);
  const totalOnus = metrics.length;
  if (totalOnus === 0) return { isFiberCut: false, losOnus: 0, totalOnus: 0 };

  const losOnus = metrics.filter(m => m.status === 'LOS' || m.status === 'OFFLINE').length;
  const isFiberCut = totalOnus > 5 && (losOnus / totalOnus) > 0.7;

  return { isFiberCut, losOnus, totalOnus };
}

/**
 * Fetches all physical ONUs currently connected to the OLT
 * Menggunakan multi-OID search untuk ZTE C600
 */
export async function discoverAllOnus(oltId: string) {
  const olt = await prisma.olt.findUnique({ where: { id: oltId } });
  if (!olt) throw new Error('OLT not found');

  const snmpVersion = olt.snmp_version === 'v2c' ? snmp.Version2c : snmp.Version1;
  const snmpPort = (olt as any).snmp_port || 2162;
  const session = snmp.createSession(olt.ip_address, olt.snmp_community, {
    version: snmpVersion,
    port: snmpPort,
    timeout: 10000,
    retries: 1
  });

  try {
    let indexMap;
    try {
      indexMap = await fetchOnuIndexMap(session, olt.type as 'ZTE' | 'HIOSO');
    } catch (error: any) {
      if (error.message?.includes('RequestTimedOut') || error.message?.includes('Timeout')) {
        throw new Error(`Perangkat fisik OLT (${olt.name}) belum terkoneksi atau offline. Harap pastikan perangkat fisik OLT sudah menyala dan terhubung.`);
      }
      throw error;
    }
    console.log(`[SNMP] Found ${Object.keys(indexMap).length} ONU indices on ${olt.name}`);
    
    // Also fetch descriptions to help map ODPs
    const descOid = olt.type === 'ZTE' ? ZTE_OIDS.desc : null;
    const descriptions = descOid ? await walkSnmp(session, descOid).catch(() => ({})) : {};

    const onus = [];
    for (const [sn, index] of Object.entries(indexMap)) {
      onus.push({
        sn,
        index,
        description: (descriptions[index] && Buffer.isBuffer(descriptions[index])) 
          ? (descriptions[index] as Buffer).toString() 
          : (descriptions[index] || null),
        oltId: olt.id
      });
    }

    return onus;
  } finally {
    session.close();
  }
}
