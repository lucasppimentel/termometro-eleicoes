test("GET to /api/v1/status should return 200", async () => {
  const response = await fetch("http://localhost:3000/api/v1/status");
  expect(response.status).toBe(200);

  const responseBody = await response.json();
  console.log(responseBody);
  const dbVersion = responseBody.database.version;
  const dbActive = responseBody.database.active_connections;

  expect(responseBody.timestamp).toBeDefined();
  expect(responseBody.database.version).toBeDefined();
  expect(dbActive).toBeDefined();

  const parsedUpdatedAt = new Date(responseBody.timestamp).toISOString();
  expect(responseBody.timestamp).toEqual(parsedUpdatedAt);

  expect(dbVersion).toEqual("2025.07.1");
});
