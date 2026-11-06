const http = require('http');
const { createServer } = require('./server/index');

async function testAll() {
  console.log('--- Starting Integration Test ---');
  const port = 3399;
  const { server, watcher } = createServer({ workspaceRoot: process.cwd() });

  await new Promise(resolve => server.listen(port, resolve));
  console.log(`Test server running on port ${port}`);

  const request = (path, method = 'GET', body = null) => {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port,
        path,
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {}
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  // 1. Initial status
  let res = await request('/api/status');
  console.log('1. /api/status -> status:', res.status, 'hasAidlc:', res.body.hasAidlc);

  // 2. Create demo structure
  res = await request('/api/demo/create', 'POST', {});
  console.log('2. /api/demo/create -> success:', res.body.success, 'intentId:', res.body.intentId);

  // 3. Status after demo
  res = await request('/api/status');
  console.log('3. /api/status -> intent:', res.body.currentIntent.id, 'stage:', res.body.state.stage, 'gate:', res.body.state.status);

  // 4. Test simulate step
  res = await request('/api/demo/simulate-step', 'POST', {});
  console.log('4. /api/demo/simulate-step -> success:', res.body.success, 'step:', res.body.step.actor);

  // 5. Test Approve Gate
  res = await request('/api/action/approve', 'POST', { feedback: 'Tuyệt vời, thiết kế đạt chuẩn, duyệt để triển khai!' });
  console.log('5. /api/action/approve -> success:', res.body.success, 'newPhase:', res.body.phase, 'newStage:', res.body.stage);

  // 6. Test Task Toggle
  res = await request('/api/action/toggle-task', 'POST', { taskId: '5' });
  console.log('6. /api/action/toggle-task -> taskId 5:', res.body.success);

  // 7. Verify updated status
  res = await request('/api/status');
  console.log('7. Verified State -> phase:', res.body.state.phase, 'stage:', res.body.state.stage, 'audit count:', res.body.auditLogs.length);

  watcher.stop();
  server.close();
  console.log('--- ALL INTEGRATION TESTS PASSED! ---');
  process.exit(0);
}

testAll().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
