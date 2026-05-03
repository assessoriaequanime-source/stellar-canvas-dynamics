import request from "supertest";
import { Wallet } from "ethers";
import app from "../../src/config/app";
import prisma from "../../src/lib/prisma";

describe("API integration: auth + user + avatar + consent", () => {
  let accessToken = "";
  let refreshToken = "";
  let avatarId = "";
  let transactionId = "";
  let capsuleId = "";
  let legacyId = "";
  let secondaryAccessToken = "";
  const wallet = Wallet.createRandom();
  const secondaryWallet = Wallet.createRandom();

  beforeAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.timeCapsule.deleteMany();
    await prisma.digitalLegacy.deleteMany();
    await prisma.avatar.deleteMany();
    await prisma.consentRegistry.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.timeCapsule.deleteMany();
    await prisma.digitalLegacy.deleteMany();
    await prisma.avatar.deleteMany();
    await prisma.consentRegistry.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("should reject invalid wallet for challenge", async () => {
    const response = await request(app).post("/api/v1/auth/challenge").send({
      walletAddress: "invalid",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_ERROR");
  });

  it("should complete auth flow and return tokens", async () => {
    const challengeResponse = await request(app).post("/api/v1/auth/challenge").send({
      walletAddress: wallet.address,
    });

    expect(challengeResponse.status).toBe(200);
    expect(challengeResponse.body.challenge).toContain("Sign in to Stellar Backend");

    const signature = await wallet.signMessage(challengeResponse.body.challenge);

    const verifyResponse = await request(app).post("/api/v1/auth/verify").send({
      walletAddress: wallet.address,
      signature,
    });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.accessToken).toBeDefined();
    expect(verifyResponse.body.refreshToken).toBeDefined();

    accessToken = verifyResponse.body.accessToken;
    refreshToken = verifyResponse.body.refreshToken;
  });

  it("should return authenticated user on /auth/me", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(true);
    expect(response.body.user.walletAddress).toBe(wallet.address.toLowerCase());
  });

  it("should update and get user profile", async () => {
    const patchResponse = await request(app)
      .patch("/api/v1/user/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        nickname: "Rodrigo",
        email: "rodrigo@example.com",
      });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.nickname).toBe("Rodrigo");

    const getResponse = await request(app)
      .get("/api/v1/user/profile")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.email).toBe("rodrigo@example.com");
  });

  it("should execute avatar CRUD", async () => {
    const createResponse = await request(app)
      .post("/api/v1/avatar")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Prime Avatar",
        traits: { intelligence: 10 },
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.name).toBe("Prime Avatar");
    avatarId = createResponse.body.id;

    const listResponse = await request(app)
      .get("/api/v1/avatar")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body)).toBe(true);
    expect(listResponse.body.length).toBeGreaterThanOrEqual(1);

    const updateResponse = await request(app)
      .patch(`/api/v1/avatar/${avatarId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Prime Avatar V2",
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe("Prime Avatar V2");

    const deleteResponse = await request(app)
      .delete(`/api/v1/avatar/${avatarId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.success).toBe(true);
  });

  it("should upsert and retrieve consent", async () => {
    const upsertResponse = await request(app)
      .put("/api/v1/consent/AVATAR_USAGE")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        status: "GRANTED",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(upsertResponse.status).toBe(200);
    expect(upsertResponse.body.type).toBe("AVATAR_USAGE");
    expect(upsertResponse.body.status).toBe("GRANTED");

    const getResponse = await request(app)
      .get("/api/v1/consent/AVATAR_USAGE")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.type).toBe("AVATAR_USAGE");
  });

  it("should refresh and logout session", async () => {
    const refreshResponse = await request(app).post("/api/v1/auth/refresh").send({
      refreshToken,
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.accessToken).toBeDefined();

    const logoutResponse = await request(app).post("/api/v1/auth/logout").send({
      refreshToken,
    });

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);
  });

  it("should execute transaction flow", async () => {
    const verifyResponse = await request(app).post("/api/v1/auth/verify").send({
      walletAddress: wallet.address,
      signature: await wallet.signMessage(
        (
          await request(app).post("/api/v1/auth/challenge").send({
            walletAddress: wallet.address,
          })
        ).body.challenge,
      ),
    });

    accessToken = verifyResponse.body.accessToken;

    const createResponse = await request(app)
      .post("/api/v1/transaction")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        type: "PURCHASE",
        amount: 12.5,
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.type).toBe("PURCHASE");
    transactionId = createResponse.body.id;

    const listResponse = await request(app)
      .get("/api/v1/transaction")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body)).toBe(true);
    expect(listResponse.body.some((item: { id: string }) => item.id === transactionId)).toBe(true);

    const patchResponse = await request(app)
      .patch(`/api/v1/transaction/${transactionId}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        status: "CONFIRMED",
      });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.status).toBe("CONFIRMED");
  });

  it("should block cross-user access to resources", async () => {
    const secondaryChallenge = await request(app).post("/api/v1/auth/challenge").send({
      walletAddress: secondaryWallet.address,
    });

    const secondaryVerify = await request(app).post("/api/v1/auth/verify").send({
      walletAddress: secondaryWallet.address,
      signature: await secondaryWallet.signMessage(secondaryChallenge.body.challenge),
    });

    secondaryAccessToken = secondaryVerify.body.accessToken;

    const ownAvatar = await request(app)
      .post("/api/v1/avatar")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Protected Avatar",
      });

    expect(ownAvatar.status).toBe(201);

    const forbiddenAvatarRead = await request(app)
      .get(`/api/v1/avatar/${ownAvatar.body.id}`)
      .set("Authorization", `Bearer ${secondaryAccessToken}`);

    expect(forbiddenAvatarRead.status).toBe(404);

    const forbiddenTxRead = await request(app)
      .get(`/api/v1/transaction/${transactionId}`)
      .set("Authorization", `Bearer ${secondaryAccessToken}`);

    expect(forbiddenTxRead.status).toBe(404);
  });

  it("should execute time capsule CRUD", async () => {
    const createResponse = await request(app)
      .post("/api/v1/capsule")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Minha Capsula",
        content: "Conteudo criptografado",
        unlockDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { scope: "private" },
      });

    expect(createResponse.status).toBe(201);
    capsuleId = createResponse.body.id;

    const listResponse = await request(app)
      .get("/api/v1/capsule")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.some((item: { id: string }) => item.id === capsuleId)).toBe(true);

    const patchResponse = await request(app)
      .patch(`/api/v1/capsule/${capsuleId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Minha Capsula V2" });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.name).toBe("Minha Capsula V2");
  });

  it("should execute digital legacy CRUD", async () => {
    const createResponse = await request(app)
      .post("/api/v1/legacy")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Legado Principal",
        beneficiaries: [{ wallet: wallet.address.toLowerCase(), share: 100 }],
        assets: [{ type: "SGL", amount: "1000" }],
      });

    expect(createResponse.status).toBe(201);
    legacyId = createResponse.body.id;

    const listResponse = await request(app)
      .get("/api/v1/legacy")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.some((item: { id: string }) => item.id === legacyId)).toBe(true);

    const patchResponse = await request(app)
      .patch(`/api/v1/legacy/${legacyId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Legado Principal V2" });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.name).toBe("Legado Principal V2");
  });

  it("should block cross-user access to capsule and legacy", async () => {
    const foreignCapsuleRead = await request(app)
      .get(`/api/v1/capsule/${capsuleId}`)
      .set("Authorization", `Bearer ${secondaryAccessToken}`);

    expect(foreignCapsuleRead.status).toBe(404);

    const foreignLegacyRead = await request(app)
      .get(`/api/v1/legacy/${legacyId}`)
      .set("Authorization", `Bearer ${secondaryAccessToken}`);

    expect(foreignLegacyRead.status).toBe(404);
  });

  it("should create audit logs for critical actions", async () => {
    const auditResponse = await request(app)
      .get("/api/v1/audit")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(auditResponse.status).toBe(200);
    expect(Array.isArray(auditResponse.body)).toBe(true);
    expect(auditResponse.body.length).toBeGreaterThan(0);

    const actions = auditResponse.body.map((item: { action: string }) => item.action);

    expect(actions).toContain("CONSENT_UPSERT");
    expect(actions).toContain("TRANSACTION_CREATE");
    expect(actions).toContain("TRANSACTION_STATUS_UPDATE");
  });

  it("should keep audit logs isolated by user", async () => {
    const secondaryAuditResponse = await request(app)
      .get("/api/v1/audit")
      .set("Authorization", `Bearer ${secondaryAccessToken}`);

    expect(secondaryAuditResponse.status).toBe(200);
    expect(Array.isArray(secondaryAuditResponse.body)).toBe(true);

    const containsPrimaryTransactionLog = secondaryAuditResponse.body.some(
      (item: { resource: string; resourceId?: string }) =>
        item.resource === "transaction" && item.resourceId === transactionId,
    );

    expect(containsPrimaryTransactionLog).toBe(false);
  });
});
