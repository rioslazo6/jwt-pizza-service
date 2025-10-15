const request = require("supertest");
const app = require("../service");
const { createAdminUser, randomName } = require("../testUtils");

const testUser = { name: "test user", email: "reg@test.com", password: "a" };
let testUserToken;
let testUserId;
let adminToken;

beforeAll(async () => {
  testUser.email = randomName() + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserToken = registerRes.body.token;
  testUserId = registerRes.body.id;

  const admin = await createAdminUser();
  const adminLoginRes = await request(app).put("/api/auth").send(admin);
  adminToken = adminLoginRes.body.token;
});

test("get logged in user", async () => {
  const getUserRes = await request(app)
    .get("/api/user/me")
    .set("Authorization", `Bearer ${testUserToken}`);
  expect(getUserRes.status).toBe(200);
  expect(getUserRes.body.name).toBe("test user");
  testUserId = getUserRes.body.id;
});

test("update user", async () => {
  testUser.name = "new name";

  const updateUserRes = await request(app)
    .put(`/api/user/${testUserId}`)
    .send(testUser)
    .set("Authorization", `Bearer ${testUserToken}`);

  expect(updateUserRes.status).toBe(200);
  expect(updateUserRes.body.user.name).toBe("new name");
});

test("list users unauthorized", async () => {
  const listUsersRes = await request(app).get("/api/user");
  expect(listUsersRes.status).toBe(401);
});

test("list users", async () => {
  const listUsersRes = await request(app)
    .get("/api/user")
    .set("Authorization", `Bearer ${adminToken}`);
  expect(listUsersRes.status).toBe(200);
  expect(listUsersRes.body.users.length).toBeGreaterThanOrEqual(1); // At least one user returned
});

test("list only 1 user", async () => {
  const listUsersRes = await request(app)
    .get("/api/user?limit=1")
    .set("Authorization", `Bearer ${adminToken}`);
  expect(listUsersRes.status).toBe(200);
  expect(listUsersRes.body.users.length).toBe(1); // Exactly one user returned
});

test("list non-existent user", async () => {
  const listUsersRes = await request(app)
    .get(`/api/user?name=${randomName()}`)
    .set("Authorization", `Bearer ${adminToken}`);
  expect(listUsersRes.status).toBe(200);
  expect(listUsersRes.body.users.length).toBe(0); // Zero users returned
});

test("delete user unauthorized", async () => {
  const deleteUserRes = await request(app)
    .delete(`/api/user/${testUserId}`)
    .set("Authorization", `Bearer ${testUserToken}`);
  expect(deleteUserRes.status).toBe(403);
});

test("delete user", async () => {
  const deleteUserRes = await request(app)
    .delete(`/api/user/${testUserId}`)
    .set("Authorization", `Bearer ${adminToken}`);
  expect(deleteUserRes.status).toBe(200);
});
