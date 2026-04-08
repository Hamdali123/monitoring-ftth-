import snmp from 'net-snmp';
import prisma from '../src/db/prisma.js';

async function broadWalk() {
    const oltId = 'fffd64a2-a648-4998-8bd4-79f3996e1c5c';
    const olt = await (prisma as any).olt.findUnique({ where: { id: oltId } });
    
    console.log(`Connecting to ${olt.name} (${olt.ip_address}:${olt.snmp_port})...`);
    
    const session = snmp.createSession(olt.ip_address, olt.snmp_community, {
        version: olt.snmp_version === 'v2c' ? snmp.Version2c : snmp.Version1,
        port: olt.snmp_port,
        timeout: 5000,
        retries: 1
    });

    const rootOid = "1.3.6.1.4.1.3902.1012.3.28"; // ZTE Pon Management
    console.log(`Walking ${rootOid}...`);

    return new Promise((resolve, reject) => {
        let count = 0;
        session.subtree(rootOid, (vbs) => {
            for (const vb of vbs) {
                count++;
                if (count < 20) {
                    if (vb.value !== null && vb.value !== undefined) {
                        const valStr = Buffer.isBuffer(vb.value) ? vb.value.toString('hex') : String(vb.value);
                        const len = Buffer.isBuffer(vb.value) ? vb.value.length : valStr.length;
                        console.log(`[${vb.oid}] = ${valStr} (len: ${len})`);
                    } else {
                        console.log(`[${vb.oid}] = null/undefined`);
                    }
                }
            }
        }, (error) => {
            session.close();
            if (error) {
                console.error('Walk Error:', error.message);
                reject(error);
            } else {
                console.log(`Total OIDs found: ${count}`);
                resolve(count);
            }
        });
    });
}

broadWalk().catch(console.error);
