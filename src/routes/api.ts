import { Router, type Request, type Response } from 'express';
import prisma from '../db/prisma.js';
import { provisionZteOnu, rebootZteOnu } from '../services/provisioning.js';
import { syncPppoeToCustomers, updateMikrotikPppoePassword } from '../services/mikrotik.js';
import { runGlobalSync } from '../services/sync-worker.js';
import { runTopologyDiscovery } from '../services/discovery.js';
import { createNotification } from '../services/notifications.js';
import { testOltConnection, testRouterConnection } from '../services/diagnostics.js';
import { 
  fetchOnuIndexMap, 
  pollOltAdvanced, 
  discoverAllOnus 
} from '../services/olt-manager.js';

const router = Router();

router.post('/customers/:id/reboot', async (req: Request, res: Response) => {
  try {
    const customer = await (prisma.customer as any).findUnique({ where: { id: req.params.id } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    console.log(`[Reboot] Attempting reboot for ${customer.name}...`);
    let success = false;
    let method = 'NONE';

    // 1. Try ACS (GenieACS)
    try {
      const acsUrl = process.env.GENIE_ACS_URL || 'http://localhost:7557';
      const response = await fetch(`${acsUrl}/devices/${encodeURIComponent(customer.sn_mac)}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'reboot' }),
      });
      if (response.ok) {
        success = true;
        method = 'ACS (TR-069)';
      }
    } catch (acsErr) {
       console.warn('[Reboot] ACS failed, trying OLT fallback...');
    }

    // 2. Fallback to OLT Telnet if ACS failed
    if (!success && (customer as any).olt_id) {
       try {
          // HEURISTIC: Defaulting to PON 1/1 if not stored explicitly
          await rebootZteOnu((customer as any).olt_id, "1/1/1", 1); 
          success = true;
          method = 'OLT CLI (Telnet)';
       } catch (oltErr) {
          console.error('[Reboot] OLT Fallback failed:', oltErr);
       }
    }

    if (success) {
      await createNotification(
        'Remote Reboot Triggered',
        `NOC staff triggered a remote reboot for ${customer.name} via ${method}.`,
        'SYSTEM',
        'INFO'
      );
      res.json({ message: `Reboot successfully triggered via ${method}` });
    } else {
      res.status(500).json({ error: 'Reboot failed on all management layers.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Reboot error', details: error.message });
  }
});

// 1. POST /api/provisioning
// Endpoint to register a new customer, save their coordinates, and link them to a specific ODP and OLT.
router.post('/provisioning', async (req: Request, res: Response) => {
  try {
    const {
      billing_id,
      name,
      pppoe_username,
      olt_id,
      odp_id,
      odp_port,
      sn_mac,
      rx_installation,
      location_lat,
      location_long,
      pon_port, // Required for OLT CLI
      onu_id,   // Required for OLT CLI
      router_id // Optional but recommended
    } = req.body;

    // Basic validation
    if (!billing_id || !name || !pppoe_username || !olt_id || !odp_id || odp_port === undefined || !sn_mac || location_lat === undefined || location_long === undefined) {
      return res.status(400).json({ error: 'Missing required provision attributes' });
    }

    // A. Save to Database
    const newCustomer = await (prisma.customer as any).create({
      data: {
        billing_id,
        name,
        pppoe_username,
        olt_id,
        odp_id,
        odp_port,
        sn_mac,
        rx_installation,
        location_lat,
        location_long,
        router_id
      },
    });

    // B. Real Hardware Provisioning (OLT)
    if (pon_port && onu_id) {
      console.log(`[Hardware] Provisioning ONU ${sn_mac} on OLT ${olt_id}`);
      try {
        await provisionZteOnu({
          oltId: olt_id,
          ponPort: pon_port,
          onuId: parseInt(onu_id),
          snMac: sn_mac,
          name: name,
          profileName: 'ZTE-F660' // Default profile
        });
      } catch (hwError: any) {
        console.warn('OLT Hardware Provisioning failed, but DB record created:', hwError.message);
      }
    }

    // C. MikroTik Sync
    if (router_id) {
      try {
        await syncPppoeToCustomers(router_id);
      } catch (mkError: any) {
        console.warn('MikroTik Sync failed:', mkError.message);
      }
    }

    res.status(201).json({ 
      message: 'Customer provisioned successfully in DB and Hardware', 
      data: newCustomer 
    });
  } catch (error: any) {
    console.error('Provisioning Error:', error);
    res.status(500).json({ error: 'Failed to provision customer', details: error.message });
  }
});

// 2. GET /api/network-map
// Endpoint to fetch all ODPs and Customers, returning structured data to draw the map and lines.
router.get('/network-map', async (req: Request, res: Response) => {
  try {
    const [odps, olts, routers] = await Promise.all([
      prisma.odp.findMany({
        include: {
          customers: {
            include: {
              metrics: { orderBy: { created_at: 'desc' }, take: 1 }
            }
          }
        }
      }),
      prisma.olt.findMany(),
      (prisma as any).router.findMany()
    ]);

    const odpData = odps.map(odp => ({
      id: odp.id,
      name: odp.name,
      location: [odp.location_lat, odp.location_long],
      type: 'ODP',
      total_ports: odp.total_ports,
      olt_id: odp.customers[0]?.olt_id || null,
      customers: odp.customers.map(c => {
        const latestMetric = c.metrics[0];
        return {
          id: c.id,
          name: c.name,
          location: [c.location_lat, c.location_long],
          type: 'CUSTOMER',
          status: latestMetric ? latestMetric.status : 'OFFLINE',
          rx_live: latestMetric ? latestMetric.rx_live : null,
          pppoe_username: c.pppoe_username,
          sn_mac: c.sn_mac,
          billing_id: c.billing_id
        };
      }),
    }));

    const oltData = olts.map(o => ({
      id: o.id,
      name: o.name,
      location: [o.location_lat || -6.1285, o.location_long || 106.46358],
      type: 'OLT',
      vendor: o.type,
      ip_address: o.ip_address
    }));

    const routerData = (routers as any[]).map(r => ({
      id: r.id,
      name: r.name,
      location: [r.location_lat || -6.1285, r.location_long || 106.46358],
      type: 'ROUTER',
      ip_address: r.ip_address
    }));

    res.json({ data: [...odpData, ...oltData, ...routerData] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch network map' });
  }
});

// --- Device Management (Routers) ---

router.get('/routers', async (req, res) => {
  try {
    const routers = await (prisma as any).router.findMany();
    res.json(routers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/routers', async (req, res) => {
  try {
    const { name, ip_address, vpn_address, username, password, secret, api_port, location_lat, location_long } = req.body;
    const router = await (prisma as any).router.create({
      data: { 
        name, 
        ip_address, 
        vpn_address, 
        username, 
        password, 
        secret, 
        api_port: parseInt(api_port) || 8728,
        location_lat: parseFloat(location_lat) || 0,
        location_long: parseFloat(location_long) || 0
      }
    });
    res.json(router);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/routers/:id', async (req, res) => {
  try {
    const { name, ip_address, vpn_address, username, password, secret, api_port, location_lat, location_long } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (ip_address !== undefined) updateData.ip_address = ip_address;
    if (vpn_address !== undefined) updateData.vpn_address = vpn_address;
    if (username !== undefined) updateData.username = username;
    if (password !== undefined) updateData.password = password;
    if (secret !== undefined) updateData.secret = secret;
    if (api_port !== undefined) updateData.api_port = parseInt(api_port) || 8728;
    if (location_lat !== undefined) updateData.location_lat = parseFloat(location_lat) || 0;
    if (location_long !== undefined) updateData.location_long = parseFloat(location_long) || 0;

    const router = await (prisma as any).router.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.json(router);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/routers/:id', async (req, res) => {
  try {
    await (prisma as any).router.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- GenieACS Settings ---

router.get('/genieacs', async (req, res) => {
  try {
    const settings = await (prisma as any).genieAcs.findFirst();
    res.json(settings || { ip_address: '', port: 7557, api_port: 7557 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/genieacs', async (req, res) => {
  try {
    const { ip_address, port, api_port } = req.body;
    let settings = await (prisma as any).genieAcs.findFirst();
    if (settings) {
      settings = await (prisma as any).genieAcs.update({
        where: { id: settings.id },
        data: { ip_address, port: parseInt(port), api_port: parseInt(api_port) }
      });
    } else {
      settings = await (prisma as any).genieAcs.create({
        data: { ip_address, port: parseInt(port), api_port: parseInt(api_port) }
      });
    }
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Remote Management (MikroTik & TR-069) ---

router.post('/customers/:id/change-pppoe', async (req, res) => {
  try {
    const { new_password } = req.body;
    const customer = await (prisma.customer as any).findUnique({ where: { id: req.params.id } });
    
    if (!customer || !(customer as any).router_id) {
       return res.status(404).json({ error: 'Customer or Router configuration not found' });
    }

    await updateMikrotikPppoePassword((customer as any).router_id, customer.pppoe_username, new_password);
    
    res.json({ message: 'PPPoE password updated successfully on MikroTik' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update PPPoE password', details: error.message });
  }
});

router.post('/customers/:id/change-wifi', async (req, res) => {
  try {
    const { new_ssid, new_password } = req.body;
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const acsConfig = await (prisma as any).genieAcs.findFirst();
    if (!acsConfig || !acsConfig.ip_address) {
       return res.status(400).json({ error: 'GenieACS not configured in Settings' });
    }

    const acsUrl = `http://${acsConfig.ip_address}:${acsConfig.api_port}`;
    const acsTasksUrl = `${acsUrl}/devices/${encodeURIComponent(customer.sn_mac)}/tasks`;

    const wifiParameters = [
      { name: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID', value: new_ssid },
      { name: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.PreSharedKey', value: new_password }
    ];

    const response = await fetch(acsTasksUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'setParameterValues', parameterValues: wifiParameters }),
    });

    if (!response.ok) throw new Error(`ACS communication failure: ${response.statusText}`);

    res.json({ message: 'WiFi change task queued via TR-069' });
  } catch (error: any) {
    res.status(500).json({ error: 'WiFi update failed', details: error.message });
  }
});

// --- OLT CRUD ---
router.get('/olts', async (req, res) => {
  try {
    const olts = await prisma.olt.findMany();
    res.json(olts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch OLTs' });
  }
});

router.post('/olts', async (req, res) => {
  try {
    const { name, ip_address, snmp_community, snmp_version, snmp_port, type, location_lat, location_long, telnet_user, telnet_pass, telnet_port } = req.body;
    const newOlt = await (prisma.olt as any).create({
      data: { 
        name, 
        ip_address, 
        snmp_community,
        snmp_version: snmp_version || 'v2c',
        snmp_port: parseInt(snmp_port) || 161,
        type,
        location_lat: parseFloat(location_lat) || 0,
        location_long: parseFloat(location_long) || 0,
        telnet_user,
        telnet_pass,
        telnet_port: parseInt(telnet_port) || 23
      },
    });
    res.status(201).json(newOlt);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create OLT', details: error.message });
  }
});

router.put('/olts/:id', async (req, res) => {
  try {
    const { name, ip_address, snmp_community, snmp_version, snmp_port, type, location_lat, location_long, telnet_user, telnet_pass, telnet_port } = req.body;
    const updatedOlt = await (prisma.olt as any).update({
      where: { id: req.params.id },
      data: { 
        name, 
        ip_address, 
        snmp_community,
        snmp_version: snmp_version || 'v2c',
        snmp_port: parseInt(snmp_port) || 161,
        type,
        location_lat: parseFloat(location_lat) || 0,
        location_long: parseFloat(location_long) || 0,
        telnet_user,
        telnet_pass,
        telnet_port: parseInt(telnet_port) || 23
      },
    });
    res.json(updatedOlt);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update OLT', details: error.message });
  }
});

router.delete('/olts/:id', async (req, res) => {
  try {
    await prisma.olt.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete OLT' });
  }
});

router.post('/olts/:id/test', async (req, res) => {
  try {
    const result = await testOltConnection(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- ODC CRUD ---
router.get('/odcs', async (req, res) => {
  try {
    const odcs = await prisma.odc.findMany({ include: { odps: true } });
    res.json(odcs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ODCs' });
  }
});

router.post('/odcs', async (req, res) => {
  try {
    const { name, location_lat, location_long } = req.body;
    const newOdc = await prisma.odc.create({
      data: { name, location_lat, location_long },
    });
    res.status(201).json(newOdc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ODC' });
  }
});

router.put('/odcs/:id', async (req, res) => {
  try {
    const { name, location_lat, location_long } = req.body;
    const updatedOdc = await prisma.odc.update({
      where: { id: req.params.id },
      data: { name, location_lat, location_long },
    });
    res.json(updatedOdc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ODC' });
  }
});

router.delete('/odcs/:id', async (req, res) => {
  try {
    await prisma.odc.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ODC' });
  }
});

// --- ODP CRUD ---
router.get('/odps', async (req, res) => {
  try {
    const odps = await prisma.odp.findMany({ include: { odc: true } });
    res.json(odps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ODPs' });
  }
});

router.post('/odps', async (req, res) => {
  try {
    const { name, odc_id, location_lat, location_long, total_ports } = req.body;
    const newOdp = await prisma.odp.create({
      data: { name, odc_id, location_lat, location_long, total_ports },
    });
    res.status(201).json(newOdp);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ODP' });
  }
});

router.put('/odps/:id', async (req, res) => {
  try {
    const { name, odc_id, location_lat, location_long, total_ports } = req.body;
    const updatedOdp = await prisma.odp.update({
      where: { id: req.params.id },
      data: { name, odc_id, location_lat, location_long, total_ports },
    });
    res.json(updatedOdp);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ODP' });
  }
});

router.delete('/odps/:id', async (req, res) => {
  try {
    await prisma.odp.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ODP' });
  }
});

// --- Dashboard Stats ---
router.get('/dashboard-stats', async (req, res) => {
  try {
    const [olts, odcs, odps, customers, routers, metrics] = await Promise.all([
      prisma.olt.count(),
      prisma.odc.count(),
      prisma.odp.count(),
      prisma.customer.count(),
      (prisma as any).router.count(),
      prisma.onuMetrics.findMany({
        distinct: ['customer_id'],
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const online = metrics.filter(m => m.status === 'ONLINE').length;
    const offline = metrics.filter(m => m.status === 'OFFLINE').length;
    const los = metrics.filter(m => m.status === 'LOS').length;

    res.json({
      counts: { olts, odcs, odps, customers, routers },
      status: { online, offline, los },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// --- Customer CRUD & Metrics ---
router.get('/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        olt: true,
        odp: true,
        metrics: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/customers/:id/history', async (req, res) => {
  try {
    const history = await prisma.onuMetrics.findMany({
      where: { customer_id: req.params.id },
      orderBy: { created_at: 'desc' },
      take: 24, // Last 24 records (e.g., 2 hours if polling every 5 min)
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer history' });
  }
});

router.put('/customers/:id', async (req, res) => {
  try {
    const { name, pppoe_username, olt_id, odp_id, odp_port, sn_mac, rx_installation, location_lat, location_long } = req.body;
    const updatedCustomer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { name, pppoe_username, olt_id, odp_id, odp_port, sn_mac, rx_installation, location_lat, location_long },
    });
    res.json(updatedCustomer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// --- Global Sync ---

router.post('/routers/:id/test', async (req, res) => {
  try {
    const result = await testRouterConnection(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync PPPoE dari router tertentu ke database customer
router.post('/routers/:id/sync', async (req, res) => {
  try {
    console.log(`[API] Manual PPPoE sync triggered for router ${req.params.id}`);
    const result = await syncPppoeToCustomers(req.params.id);
    res.json({ message: `Synced ${result.syncedCount} PPPoE secrets from MikroTik`, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: `MikroTik sync failed: ${error.message}` });
  }
});

// --- Global Sync ---

router.post('/sync', async (req, res) => {
  try {
    await runGlobalSync();
    res.json({ message: 'Synchronization triggered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Synchronization failed' });
  }
});

router.post('/discover', async (req, res) => {
  try {
    const results = await runTopologyDiscovery();
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: 'Discovery failed', details: error.message });
  }
});

// --- Notifications ---
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await (prisma as any).notification.findMany({
      orderBy: { created_at: 'desc' },
      take: 50
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    await (prisma as any).notification.update({
      where: { id: req.params.id },
      data: { is_read: true }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.delete('/notifications', async (req, res) => {
  try {
    await (prisma as any).notification.deleteMany({});
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

export default router;
