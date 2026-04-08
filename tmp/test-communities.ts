import snmp from 'net-snmp';

async function testCommunity(ip: string, community: string, version: 0 | 1) {
    return new Promise((resolve, reject) => {
        const session = snmp.createSession(ip, community, {
            version: version,
            timeout: 2000,
            retries: 0
        });

        const oid = "1.3.6.1.2.1.1.1.0"; // sysDescr

        session.get([oid], (error, varbinds) => {
            session.close();
            if (error) {
                resolve({ success: false, error: error.message });
            } else if (varbinds && varbinds.length > 0 && varbinds[0] && varbinds[0].value !== null && varbinds[0].value !== undefined) {
                const val = varbinds[0].value;
                resolve({ success: true, value: Buffer.isBuffer(val) ? val.toString() : String(val) });
            } else {
                resolve({ success: false, error: 'Invalid response from SNMP' });
            }
        });
    });
}

async function run() {
    const target = "103.68.214.171";
    const communities = ["0emuSUphl3yq", "public", "private", "ZTE_SNMP"];
    const versions: (0 | 1)[] = [snmp.Version2c, snmp.Version1];

    console.log(`Testing reachability for ${target}...`);
    for (const community of communities) {
        for (const version of versions) {
            console.log(`Trying community: ${community} (version: ${version === 1 ? 'v2c' : 'v1'})...`);
            const res: any = await testCommunity(target, community, version);
            if (res.success) {
                console.log(`[SUCCESS] Community: ${community} worked!`);
                console.log(`[DESC] ${res.value}`);
                return;
            } else {
                console.log(`[FAIL] ${res.error}`);
            }
        }
    }
    console.log("No community string worked.");
}

run().catch(console.error);
