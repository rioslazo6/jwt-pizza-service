const request = require("supertest");
const app = require("../service");
const { createAdminUser, randomName } = require("../testUtils");

let adminId;
let adminEmail;
let adminToken;
let franchiseId;
let storeId;

beforeAll(async () => {
  const admin = await createAdminUser();
  const adminLoginRes = await request(app).put("/api/auth").send(admin);

  adminId = adminLoginRes.body.user.id;
  adminEmail = adminLoginRes.body.user.email;
  adminToken = adminLoginRes.body.token;

  const testFranchise = { name: randomName(), admins: [{ email: adminEmail }] };
  const createFranchiseRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(testFranchise);

  franchiseId = createFranchiseRes.body.id;

  const testStore = { franchiseId: franchiseId, name: randomName() };
  const createStoreRes = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send(testStore);

  storeId = createStoreRes.body.id;
});

test("create franchise", async () => {
  const franchiseName = randomName();
  const franchise = { name: franchiseName, admins: [{ email: adminEmail }] };
  const createFranchiseRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(franchise);

  expect(createFranchiseRes.status).toBe(200);
  expect(createFranchiseRes.body.name).toBe(franchiseName);
});

test("list user franchises", async () => {
  const getFranchisesRes = await request(app)
    .get(`/api/franchise/${adminId}`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(getFranchisesRes.status).toBe(200);
  expect(getFranchisesRes.body.length).toBeGreaterThanOrEqual(1); // At least the one added at the top
});

test("create store", async () => {
  const storeName = randomName();
  const store = { franchiseId: franchiseId, name: storeName };
  const createStoreRes = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send(store);

  expect(createStoreRes.status).toBe(200);
  expect(createStoreRes.body.name).toBe(storeName);
});

test("delete store", async () => {
  const deleteStoreRes = await request(app)
    .delete(`/api/franchise/${franchiseId}/store/${storeId}`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(deleteStoreRes.status).toBe(200);
  expect(deleteStoreRes.body.message).toBe("store deleted");
});

test("delete franchise", async () => {
  const deleteFranchiseRes = await request(app)
    .delete(`/api/franchise/${franchiseId}`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(deleteFranchiseRes.status).toBe(200);
  expect(deleteFranchiseRes.body.message).toBe("franchise deleted");
});
