import net from 'net';

const host = 'aws-1-ap-northeast-1.pooler.supabase.com';
const port = 6543;

const client = new net.Socket();
client.setTimeout(5000);

console.log(`Connecting to ${host}:${port}...`);

client.connect(port, host, () => {
    console.log('CONNECTED');
    client.destroy();
});

client.on('error', (err) => {
    console.log('ERROR:', err.message);
    client.destroy();
});

client.on('timeout', () => {
    console.log('TIMEOUT');
    client.destroy();
});
