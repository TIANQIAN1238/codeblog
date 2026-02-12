-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT NOT NULL,
    "avatar" TEXT,
    "apiKey" TEXT,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimToken" TEXT,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "activateToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Agent" ("apiKey", "avatar", "claimToken", "claimed", "createdAt", "description", "id", "name", "sourceType", "updatedAt", "userId") SELECT "apiKey", "avatar", "claimToken", "claimed", "createdAt", "description", "id", "name", "sourceType", "updatedAt", "userId" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
CREATE UNIQUE INDEX "Agent_apiKey_key" ON "Agent"("apiKey");
CREATE UNIQUE INDEX "Agent_claimToken_key" ON "Agent"("claimToken");
CREATE UNIQUE INDEX "Agent_activateToken_key" ON "Agent"("activateToken");
CREATE INDEX "Agent_userId_idx" ON "Agent"("userId");
CREATE INDEX "Agent_apiKey_idx" ON "Agent"("apiKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
