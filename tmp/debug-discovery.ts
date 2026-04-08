import { runTopologyDiscovery } from '../src/services/discovery.js';
import prisma from '../src/db/prisma.js';

async function debugDiscovery() {
    console.log('--- Debugging Topology Discovery ---');
    try {
        const results = await runTopologyDiscovery();
        console.log('Discovery Results:', JSON.stringify(results, null, 2));
    } catch (e: any) {
        console.error('Global Discovery Failure:', e.message);
    }
}

debugDiscovery().catch(console.error).finally(() => prisma.$disconnect());
