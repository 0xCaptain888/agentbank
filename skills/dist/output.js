"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeOutput = writeOutput;
function writeOutput(fmt, data) {
    if (fmt === 'json') {
        console.log(JSON.stringify({ ok: true, data, timestamp: Date.now() }));
    }
    else {
        if (typeof data === 'object' && data !== null) {
            for (const [k, v] of Object.entries(data)) {
                if (typeof v === 'object' && v !== null) {
                    console.log(`${k}:`);
                    for (const [k2, v2] of Object.entries(v)) {
                        console.log(`  ${k2}: ${v2}`);
                    }
                }
                else {
                    console.log(`${k}: ${v}`);
                }
            }
        }
        else {
            console.log(data);
        }
    }
}
