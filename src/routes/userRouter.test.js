const request = require("supertest");
const app = require("../service");

const testUser = { name: "test user", email: "reg@test.com", password: "a" };
let testUserToken;
let testUserId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserToken = registerRes.body.token;
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
