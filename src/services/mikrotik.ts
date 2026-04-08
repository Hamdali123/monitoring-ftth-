import pkg from 'mikro-routeros';
const { RouterOSClient } = pkg;
import prisma from '../db/prisma.js';

const CONNECTION_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[Timeout] ${label} did not complete within ${ms}ms`)), ms)
    )
  ]);
}

export async function fetchMikrotikPppoe(routerId: string) {
  const router = await (prisma.router as any).findUnique({ where: { id: routerId } });
  if (!router) throw new Error('Router not found');

  const targetIp = router.vpn_address || router.ip_address;
  const client = new RouterOSClient(targetIp, router.api_port);

  try {
    await withTimeout(client.connect(), CONNECTION_TIMEOUT_MS, `Connect to ${router.name} (${targetIp}:${router.api_port})`);
    await withTimeout(client.login(router.username, router.password), CONNECTION_TIMEOUT_MS, `Login to ${router.name}`);
    
    // Fetch PPPoE Secrets (Configured Users)
    const secrets = await withTimeout(
      client.runQuery('/ppp/secret/print'),
      15000,
      `Fetch PPPoE secrets from ${router.name}`
    );
    
    // Fetch Active PPPoE Sessions
    const active = await withTimeout(
      client.runQuery('/ppp/active/print'),
      10000,
      `Fetch active sessions from ${router.name}`
    );

    console.log(`[MikroTik] Got ${secrets.length} secrets and ${active.length} active sessions from ${router.name}`);
    return { secrets, active };
  } catch (error: any) {
    console.error(`[MikroTik] Connection Error (${router.name} @ ${targetIp}:${router.api_port}): ${error.message}`);
    if (error.message?.includes('Timeout') || error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED') || error.message?.includes('EHOSTUNREACH')) {
      throw new Error(`Perangkat fisik MikroTik (${router.name}) belum terkoneksi atau offline. Harap pastikan perangkat sudah menyala dan terhubung dengan jaringan.`);
    }
    throw error;
  } finally {
    try { client.close(); } catch (_) {}
  }
}

export async function syncPppoeToCustomers(routerId: string) {
  const { secrets, active } = await fetchMikrotikPppoe(routerId);
  
  // Build active session map for quick lookup
  const activeMap: Record<string, any> = {};
  for (const session of active) {
    if (session.name) activeMap[session.name] = session;
  }

  const processedUsers = new Set<string>();
  let syncedCount = 0;

  // Combine secrets and active into one unified processing queue
  // Active goes first to prioritize users currently online (they have real Caller-IDs/MACs)
  const unifiedList = [
    ...active.map((a: any) => ({
      name: a.name,
      address: a.address,
      mac: a['caller-id'],
      comment: a.comment || '',
      isRadius: true
    })),
    ...secrets.map((s: any) => ({
      name: s.name,
      address: s['remote-address'],
      mac: null, // secrets typically don't store MAC directly unless in comment
      comment: s.comment || '',
      isRadius: false
    }))
  ];

  // Prepare defaults logic
  let olt: any = null;
  let odc: any = null;

  for (const user of unifiedList) {
    const pppoeUser = user.name;
    if (!pppoeUser || processedUsers.has(pppoeUser)) continue;
    processedUsers.add(pppoeUser);

    const remoteAddress = user.address || activeMap[pppoeUser]?.address;
    const comment = user.comment;
    
    // SnMac extraction priority: Active caller-id -> fallback unique string
    const snMac = user.mac || activeMap[pppoeUser]?.['caller-id'] || `AUTO-MAC-${pppoeUser}`;

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { pppoe_username: pppoeUser }
    });

    let customerIdToUpdate = null;

    if (customer) {
      customerIdToUpdate = customer.id;
      await (prisma.customer as any).update({
        where: { id: customer.id },
        data: { 
          router_id: routerId,
          modem_ip: remoteAddress || (customer as any).modem_ip,
          // Only update SN MAC if our active session pulled a real one, and db has a fake one
          sn_mac: (snMac && customer.sn_mac.includes('AUTO-MAC-') && !snMac.includes('AUTO-MAC-')) ? snMac : undefined
        }
      });
    } else {
      // --- SMART AUTO-DISCOVERY ---
      if (!olt) {
        olt = await (prisma.olt as any).findFirst({ where: { name: "UNMAPPED-OLT" } });
        if (!olt) {
          olt = await (prisma.olt as any).findFirst();
          if (!olt) olt = await (prisma.olt as any).create({ data: { name: "UNMAPPED-OLT", ip_address: "127.0.0.1", snmp_community: "public", type: "ZTE", location_lat: 0, location_long: 0 } });
        }
      }
      if (!odc) {
        odc = await (prisma.odc as any).findFirst({ where: { name: "UNMAPPED-ODC" } });
        if (!odc) odc = await (prisma.odc as any).create({ data: { name: "UNMAPPED-ODC", location_lat: 0, location_long: 0 } });
      }

      const odpNameFromComment = comment ? comment.split(' ')[0] : "UNMAPPED-ODP";
      let odp = await (prisma.odp as any).findFirst({ where: { name: { equals: odpNameFromComment, mode: 'insensitive' } } });
      if (!odp) {
        odp = await (prisma.odp as any).create({ data: { name: odpNameFromComment, odc_id: odc.id, total_ports: 8, location_lat: 0, location_long: 0 } });
      }

      try {
        const createdCustomer = await (prisma.customer as any).create({
          data: {
            billing_id: `AUTO-${pppoeUser}`,
            name: comment || pppoeUser,
            pppoe_username: pppoeUser,
            router_id: routerId,
            olt_id: olt.id,
            odp_id: odp.id,
            odp_port: 1, 
            sn_mac: snMac,
            location_lat: 0,
            location_long: 0,
            modem_ip: remoteAddress
          }
        });
        customerIdToUpdate = createdCustomer.id;
        console.log(`[Smart-Sync] Auto-discovered ${user.isRadius?'RADIUS ':''}Customer: ${pppoeUser}`);
      } catch (e: any) {
        if (e.code === 'P2002') {
          console.warn(`[Smart-Sync] Duplicate MAC/User skipped: ${pppoeUser} (${snMac})`);
        } else {
          throw e;
        }
      }
    }

    if (customerIdToUpdate) {
      syncedCount++;
      const isActive = !!activeMap[pppoeUser];
      await prisma.onuMetrics.create({
        data: {
          customer_id: customerIdToUpdate,
          status: isActive ? 'ONLINE' : 'OFFLINE',
          rx_live: null
        }
      });
    }
  }
  
  return { syncedCount };
}

export async function updateMikrotikPppoePassword(routerId: string, pppoeUsername: string, newPassword: string) {
  const router = await (prisma.router as any).findUnique({ where: { id: routerId } });
  if (!router) throw new Error('Router not found');

  const client = new RouterOSClient(router.ip_address, router.api_port);

  try {
    await withTimeout(client.connect(), CONNECTION_TIMEOUT_MS, `Connect to ${router.name}`);
    await withTimeout(client.login(router.username, router.password), CONNECTION_TIMEOUT_MS, `Login to ${router.name}`);

    // 1. Find the ID of the secret
    const secrets = await client.runQuery(`/ppp/secret/print`, { name: pppoeUsername });
    if (!secrets || secrets.length === 0) {
      throw new Error(`PPPoE Secret for ${pppoeUsername} not found on router.`);
    }

    const secretId = secrets[0]['.id'];

    // 2. Set new password
    await client.runQuery('/ppp/secret/set', { 
      '.id': secretId,
      'password': newPassword 
    });

    console.log(`[Mikrotik] Password updated for ${pppoeUsername} on ${router.name}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Mikrotik] Update Error:`, error.message);
    if (error.message?.includes('Timeout') || error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED') || error.message?.includes('EHOSTUNREACH')) {
      throw new Error(`Perangkat fisik MikroTik (${router.name}) belum terkoneksi atau offline. Harap pastikan perangkat sudah menyala dan terhubung dengan jaringan.`);
    }
    throw error;
  } finally {
    try { client.close(); } catch (_) {}
  }
}
