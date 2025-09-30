const request = require("supertest");
const app = require("../service");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserRegisterToken;
let testUserLoginToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserRegisterToken = registerRes.body.token;
  expectValidJwt(testUserRegisterToken);
});

test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  expect(loginRes.status).toBe(200);
  testUserLoginToken = loginRes.body.token;
  expectValidJwt(testUserLoginToken);

  const expectedUser = { ...testUser, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test("register with missing fields", async () => {
  const incompleteUser = { name: "pizza diner", email: "reg@test.com" };
  const registerRes = await request(app).post("/api/auth").send(incompleteUser);
  expect(registerRes.status).toBe(400);
  expect(registerRes.body.message).toBe("name, email, and password are required");
});

test("logout", async () => {
  const logoutRes = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${testUserLoginToken}`);

  expect(logoutRes.status).toBe(200);
});

test("logout with invalid token", async () => {
  const logoutRes = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${testUserLoginToken}`);

  expect(logoutRes.status).toBe(401);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}
