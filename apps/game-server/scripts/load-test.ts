import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";
const NUM_CONNECTIONS = 50;

async function runLoadTest() {
  console.log(`Starting load test with ${NUM_CONNECTIONS} connections...`);
  
  let connectedCount = 0;
  let rateLimitedCount = 0;
  let successCount = 0;

  const clients = Array.from({ length: NUM_CONNECTIONS }, () => io(SERVER_URL, {
    transports: ['websocket']
  }));

  const promises = clients.map((client, i) => {
    return new Promise<void>((resolve) => {
      client.on("connect", () => {
        connectedCount++;
        // Attempt to create a room
        client.emit("lobby:create", { subjectSlug: 'matematica', grade: '3-em', isPublic: true });
      });

      client.on("lobby:created", () => {
        successCount++;
        client.disconnect();
        resolve();
      });

      client.on("error", (err: any) => {
        if (err.code === "RATE_LIMIT_EXCEEDED") {
          rateLimitedCount++;
        }
        client.disconnect();
        resolve();
      });

      // Timeout fallback
      setTimeout(() => {
        client.disconnect();
        resolve();
      }, 5000);
    });
  });

  await Promise.all(promises);

  console.log('--- Load Test Results ---');
  console.log(`Connected: ${connectedCount}`);
  console.log(`Successful Room Creations: ${successCount}`);
  console.log(`Rate Limited: ${rateLimitedCount}`);

  if (rateLimitedCount > 0 && successCount <= 10) {
    console.log('✅ Rate limiting is working correctly!');
  } else {
    console.log('❌ Rate limiting failed or behaved unexpectedly.');
    process.exit(1);
  }
}

runLoadTest().catch(console.error);
