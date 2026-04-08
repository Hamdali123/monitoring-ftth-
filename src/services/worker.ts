import cron from 'node-cron';
import prisma from '../db/prisma.js';
import { pollOltAdvanced } from './olt-manager.js';
import { syncPppoeToCustomers } from './mikrotik.js';

export function startSnmpWorker() {
  console.log('Starting SNMP Polling Worker...');
  
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Worker] Running SNMP poll cycle at', new Date().toISOString());
    try {
      // 0. Sync MikroTik PPPoE first to discover new customers
      const routers = await (prisma as any).router.findMany();
      for (const router of routers) {
        try {
          console.log(`[Worker] Syncing MikroTik ${router.name}...`);
          await syncPppoeToCustomers(router.id);
        } catch (err) {
          console.error(`[Worker] Failed to sync MikroTik ${router.name}:`, err);
        }
      }

      // 1. Fetch all OLTs
      const olts = await prisma.olt.findMany({
        include: { customers: true },
      });

      // 2. Poll each OLT (Single walk for all customers)
      for (const olt of olts) {
        if (!olt.customers.length) continue;

        console.log(`[Worker] Polling OLT ${olt.name} (${olt.ip_address}) for ${olt.customers.length} customers`);

        try {
          const oltResults = await pollOltAdvanced(olt.id);
          
          for (const result of oltResults) {
            await prisma.onuMetrics.create({
              data: {
                customer_id: result.customer_id,
                rx_live: result.rx_live,
                tx_live: 0,
                status: result.status as any,
              },
            });

            // Update modem_ip in customer record if found
            if (result.modem_ip) {
              await prisma.customer.update({
                where: { id: result.customer_id },
                data: { modem_ip: result.modem_ip }
              });
            }
          }
          console.log(`  -> Recorded metrics for ${oltResults.length} customers on ${olt.name}.`);
        } catch (error: any) {
          console.error(`  -> Failed to poll OLT ${olt.name}:`, error.message);
          
          // Fallback: Mark all customers for this OLT as OFFLINE if the whole OLT is unreachable
          for (const customer of olt.customers) {
            await prisma.onuMetrics.create({
              data: {
                customer_id: customer.id,
                status: 'OFFLINE',
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('[Worker] Fatal error during polling cycle:', error);
    }
  });
}
