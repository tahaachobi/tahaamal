import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:ztcIoXhEPwLQgoALcIyRNsprqaYKHmWt@tramway.proxy.rlwy.net:30464/postgres"
  });
  await client.connect();
  const res = await client.query('SELECT datname FROM pg_database');
  console.log(res.rows.map(r => r.datname));
  await client.end();
}

main();
