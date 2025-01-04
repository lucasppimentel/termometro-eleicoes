test("GET to /api/v1/status should return 200", async () => {
  const response = await fetch("http://localhost:3000/api/v1/status");
  expect(response.status).toBe(200);

  const responseBody = await response.json();
  console.log(responseBody);
  const dbVersion = responseBody.database.version;
  const dbMaxCon = responseBody.database.max_connections;
  const dbActive = responseBody.database.active_connections;

  expect(responseBody.timestamp).toBeDefined();
  expect(responseBody.database.version).toBeDefined();
  expect(responseBody.database.max_connections).toBeDefined();
  expect(responseBody.database.active_connections).toBeDefined();

  const parsedUpdatedAt = new Date(responseBody.timestamp).toISOString();
  expect(responseBody.timestamp).toEqual(parsedUpdatedAt);

  expect(dbVersion).toEqual("16.6");
  expect(dbMaxCon).toBe(100);
  expect(dbActive).toBe(1);
});
