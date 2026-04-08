import snmp from 'net-snmp';
import pkg from 'mikro-routeros';
const { RouterOSClient } = pkg;
import prisma from '../db/prisma.js';

export async function testOltConnection(oltId: string) {
  const olt = await prisma.olt.findUnique({ where: { id: oltId } });
  if (!olt) throw new Error('OLT not found');

  const community = olt.snmp_community.trim();
  
  const trySnmp = (version: 0 | 1): Promise<any> => {
    return new Promise((resolve, reject) => {
      const snmpPort = (olt as any).snmp_port || 2162;
      const session = snmp.createSession(olt.ip_address, community, {
        version: version,
        port: snmpPort,
        timeout: 5000,
        retries: 1
      });

      // OID for sysDescr
      const oid = "1.3.6.1.2.1.1.1.0";

      session.get([oid], (error, varbinds) => {
        session.close();
        if (error) {
          reject(error);
        } else if (!varbinds || varbinds.length === 0) {
          reject(new Error("No varbinds returned"));
        } else {
          const vb = varbinds[0];
          if (!vb || snmp.isVarbindError(vb)) {
            reject(new Error(vb ? snmp.varbindError(vb) : "Empty varbind"));
          } else {
            resolve({
              success: true,
              version: version === snmp.Version2c ? "v2c" : "v1",
              description: vb.value ? vb.value.toString() : "No description",
              message: `Successfully connected to OLT (${olt.name}) via SNMP ${version === snmp.Version2c ? 'v2c' : 'v1'}`
            });
          }
        }
      });
    });
  };

  try {
    // Try v2c first
    return await trySnmp(snmp.Version2c);
  } catch (err2c: any) {
    console.warn(`[SNMP-Test] v2c failed for ${olt.name} (${olt.ip_address}): ${err2c.message}. Trying v1 fallback...`);
    try {
      // Fallback to v1
      return await trySnmp(snmp.Version1);
    } catch (err1: any) {
      if (err2c.message?.includes('RequestTimedOut') || err1.message?.includes('RequestTimedOut') || err2c.message?.includes('Timeout')) {
        throw new Error(`Perangkat fisik OLT (${olt.name}) belum terkoneksi atau offline. Harap pastikan perangkat fisik OLT sudah menyala dan terhubung.`);
      }
      throw new Error(`SNMP Failure (v2c: ${err2c.message}, v1: ${err1.message})`);
    }
  }
}

export async function testRouterConnection(routerId: string) {
  const router = await (prisma as any).router.findUnique({ where: { id: routerId } });
  if (!router) throw new Error('Router not found');

  // Prioritize VPN/Remote address for routers behind NAT
  const targetIp = router.vpn_address || router.ip_address;
  const client = new RouterOSClient(targetIp, router.api_port);

  try {
    // Timeout-wrapped connection
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 5000));
    
    await Promise.race([connectPromise, timeoutPromise]);
    await client.login(router.username, router.password);
    
    const resource = await client.runQuery('/system/resource/print');
    
    return {
      success: true,
      version: resource[0]?.version || 'Unknown',
      board: resource[0]?.['board-name'] || 'Unknown',
      message: `Successfully connected to Router (${router.name}) via API`
    };
  } catch (error: any) {
    if (error.message?.includes('timed out') || error.message?.includes('Timeout') || error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED') || error.message?.includes('EHOSTUNREACH')) {
      throw new Error(`Perangkat fisik MikroTik (${router.name}) belum terkoneksi atau offline. Harap pastikan perangkat fisik MikroTik sudah menyala dan terhubung.`);
    }
    throw new Error(`MikroTik Error: ${error.message}`);
  } finally {
    client.close();
  }
}
