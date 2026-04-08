import prisma from '../src/db/prisma.js';

async function fixDb() {
  console.log('--- Database Cleanup script ---');

  // 1. Relocate OLT
  const olt = await prisma.olt.findFirst({ where: { name: 'C600-SANWANI' } });
  if (olt) {
    await prisma.olt.update({
      where: { id: olt.id },
      data: {
        location_lat: -6.158,
        location_long: 106.463
      }
    });
    console.log(`Relocated OLT ${olt.name} to Tangerang.`);
  } else {
    console.warn('OLT C600-SANWANI not found.');
  }

  // 2. Remove dummy customer
  const dummy = await (prisma.customer as any).findFirst({ where: { sn_mac: 'pppoe' } });
  if (dummy) {
    // Delete metrics first to avoid FK constraint error
    await (prisma as any).onuMetrics.deleteMany({ where: { customer_id: dummy.id } });
    await (prisma.customer as any).delete({ where: { id: dummy.id } });
    console.log(`Deleted dummy customer and metrics: ${dummy.name} (SN: ${dummy.sn_mac})`);
  } else {
    console.warn('Dummy customer "pppoe" not found.');
  }

  console.log('--- Cleanup complete ---');
}

fixDb().catch(console.error).finally(() => prisma.$disconnect());
