import prisma from '../db/prisma.js';
import { fetchMikrotikPppoe } from './mikrotik.js';
import { createNotification } from './notifications.js';
import { pollOltAdvanced, discoverAllOnus } from './olt-manager.js';

export async function runTopologyDiscovery() {
  console.log('[Discovery] Starting global topology reconstruction...');
  const results = {
    newCustomers: 0,
    newOdps: 0,
    newOdcs: 0,
    errors: [] as string[]
  };

  try {
    // 1. Fetch data from all Routers (MikroTik) for potential mapping
    const routers = await (prisma as any).router.findMany();
    const allSecrets: any[] = [];
    for (const router of routers) {
      try {
        const { secrets } = await fetchMikrotikPppoe(router.id);
        allSecrets.push(...secrets.map((s: any) => ({ ...s, routerId: router.id })));
      } catch (e: any) {
        console.warn(`[Discovery] Failed to fetch secrets from ${router.name}: ${e.message}`);
      }
    }

    // 2. Fetch data from all OLTs (Physical Discovery)
    const olts = await prisma.olt.findMany();
    const physicalOnus: any[] = [];
    for (const olt of olts) {
      try {
        console.log(`[Discovery] Scanning OLT: ${olt.name}...`);
        const onus = await discoverAllOnus(olt.id);
        physicalOnus.push(...onus);
      } catch (e: any) {
        results.errors.push(`OLT ${olt.name}: ${e.message}`);
      }
    }

    // 3. Match Physical ONUs with MikroTik Secrets & DB
    for (const phy of physicalOnus) {
      // Is this ONU already managed in our DB?
      const existing = await prisma.customer.findFirst({
        where: { sn_mac: phy.sn }
      });

      if (existing) continue;

      // Unmanaged ONU found! Try to find a MikroTik secret with this SN in the comment
      const snUpper = phy.sn.toUpperCase();
      const matchingSecret = allSecrets.find(s => 
        (s.comment && s.comment.toUpperCase().includes(snUpper)) ||
        (s.service && s.service.toUpperCase() === snUpper)
      );

      // Metadata for the new customer
      const pppoeUser = matchingSecret ? matchingSecret.name : `SN-${phy.sn.slice(-4)}`;
      const comment = (matchingSecret && matchingSecret.comment) 
        ? matchingSecret.comment 
        : (phy.description || `Discovered ONU ${phy.sn}`);
      
      const routerId = matchingSecret ? matchingSecret.routerId : null;

      // Heuristic: Find/Create ODP for this new client
      // 1. Try to find ODP name in description or comment
      const odpMatch = comment.match(/ODP-[\w-]+/i);
      const odpName = odpMatch ? odpMatch[0].toUpperCase() : 'ODP-AUTO-DISCOVERED';

      // 2. Fetch OLT to use its coordinates as reference
      const oltRef = await prisma.olt.findUnique({ where: { id: phy.oltId } });
      const baseLat = oltRef?.location_lat || -6.1285;
      const baseLong = oltRef?.location_long || 106.46358;

      let odc = await (prisma.odc as any).findFirst();
      if (!odc) {
        odc = await (prisma.odc as any).create({
          data: { name: 'BACKBONE-HUB', location_lat: baseLat, location_long: baseLong }
        });
      }

      let odp = await (prisma.odp as any).findFirst({ where: { name: odpName } });
      if (!odp) {
        odp = await (prisma.odp as any).create({
          data: { 
            name: odpName, 
            odc_id: odc.id, 
            total_ports: 8,
            location_lat: baseLat + (Math.random() * 0.005 - 0.0025),
            location_long: baseLong + (Math.random() * 0.005 - 0.0025)
          }
        });
        results.newOdps++;
      }

      // Create managed customer record
      const customer = await (prisma.customer as any).create({
        data: {
          billing_id: `AUTO-${phy.sn.slice(-6)}`,
          name: comment || pppoeUser,
          pppoe_username: pppoeUser,
          olt_id: phy.oltId,
          odp_id: odp.id,
          odp_port: 1,
          sn_mac: phy.sn,
          router_id: routerId,
          location_lat: odp.location_lat + (Math.random() * 0.002 - 0.001),
          location_long: odp.location_long + (Math.random() * 0.002 - 0.001),
          rx_installation: -22
        }
      });

      await createNotification(
        'New Client Discovered',
        `Physical ONU ${phy.sn} discovered on ${oltRef?.name}. Mapped to ${pppoeUser}.`,
        'NEW_CLIENT',
        'INFO'
      );

      results.newCustomers++;
    }

  } catch (globalErr: any) {
    results.errors.push(`Global: ${globalErr.message}`);
  }

  return results;
}
