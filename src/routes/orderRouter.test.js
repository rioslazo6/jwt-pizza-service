const request = require("supertest");
const app = require("../service");
const { createAdminUser, randomName } = require("../testUtils");

const diner = { name: "diner user", email: "reg@test.com", password: "a" };
let dinerToken;
let dinerUserId;
let adminToken;

beforeAll(async () => {
  diner.email = randomName() + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(diner);

  dinerToken = registerRes.body.token;
  dinerUserId = registerRes.body.user.id;

  const admin = await createAdminUser();
  const adminLoginRes = await request(app).put("/api/auth").send(admin);

  adminToken = adminLoginRes.body.token;
});

test("get menu", async () => {
  const getMenuRes = await request(app)
    .get("/api/order/menu")
    .set("Authorization", `Bearer ${dinerToken}`);

  expect(getMenuRes.status).toBe(200);
});

test("add menu item", async () => {
  const itemName = randomName();
  const menuItem = {
    title: itemName,
    description: "test description for a random item",
    image: "random.png",
    price: 0.5,
  };

  const addItemRes = await request(app)
    .put("/api/order/menu")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(menuItem);

  expect(addItemRes.status).toBe(200);

  // Checking that the response has at least one item (the one that was added)
  expect(addItemRes.body.length).toBeGreaterThanOrEqual(1);

  // Checking that the response includes an item that matches the random name generated when adding it
  expect(addItemRes.body).toEqual(
    expect.arrayContaining([expect.objectContaining({ title: itemName })])
  );
});

test("get orders", async () => {
  const getMenuRes = await request(app)
    .get("/api/order")
    .set("Authorization", `Bearer ${dinerToken}`);

  expect(getMenuRes.status).toBe(200);
});
