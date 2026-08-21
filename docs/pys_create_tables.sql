-- =============================================================================
-- PYS (Proje Yönetim Sistemi) — PostgreSQL CREATE TABLE Scripti
-- EF Core Entity'lerden ve DbContext konfigürasyonundan birebir çıkarılmıştır.
-- Tarih: 2026-05-21
-- =============================================================================

-- Sıralama: Önce bağımsız tablolar, sonra bağımlı tablolar (FK sırası).

-- =============================================================================
-- 1. ASP.NET IDENTITY TABLOLARI
-- =============================================================================

-- 1.1 AspNetRoles (Roller)
CREATE TABLE IF NOT EXISTS "AspNetRoles" (
    "Id"               UUID           NOT NULL DEFAULT gen_random_uuid(),
    "Name"             VARCHAR(256)   NULL,
    "NormalizedName"   VARCHAR(256)   NULL,
    "ConcurrencyStamp" TEXT          NULL,
    "CreatedAt"        TIMESTAMP      NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    "UpdatedAt"        TIMESTAMP      NULL,
    "IsDeleted"        BOOLEAN        NOT NULL DEFAULT FALSE,
    CONSTRAINT "PK_AspNetRoles" PRIMARY KEY ("Id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RoleNameIndex"
    ON "AspNetRoles" ("NormalizedName")
    WHERE "NormalizedName" IS NOT NULL;

-- 1.2 AspNetUsers (Kullanıcılar)
CREATE TABLE IF NOT EXISTS "AspNetUsers" (
    "Id"                   UUID           NOT NULL DEFAULT gen_random_uuid(),
    "UserName"             VARCHAR(256)   NULL,
    "NormalizedUserName"   VARCHAR(256)   NULL,
    "Email"                VARCHAR(256)   NULL,
    "NormalizedEmail"      VARCHAR(256)   NULL,
    "EmailConfirmed"       BOOLEAN        NOT NULL DEFAULT FALSE,
    "PasswordHash"         TEXT           NULL,
    "SecurityStamp"        TEXT           NULL,
    "ConcurrencyStamp"     TEXT           NULL,
    "PhoneNumber"          TEXT           NULL,
    "PhoneNumberConfirmed" BOOLEAN        NOT NULL DEFAULT FALSE,
    "TwoFactorEnabled"     BOOLEAN        NOT NULL DEFAULT FALSE,
    "LockoutEnd"           TIMESTAMPTZ    NULL,
    "LockoutEnabled"       BOOLEAN        NOT NULL DEFAULT FALSE,
    "AccessFailedCount"    INTEGER        NOT NULL DEFAULT 0,

    -- BaseEntity benzeri alanlar (manuel tanımlı)
    "CreatedAt"            TIMESTAMP      NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    "UpdatedAt"            TIMESTAMP      NULL,
    "IsDeleted"            BOOLEAN        NOT NULL DEFAULT FALSE,

    -- Özel alanlar
    "FullName"             TEXT           NOT NULL DEFAULT '',
    "Title"                TEXT           NOT NULL DEFAULT '',
    "IsActive"             BOOLEAN        NOT NULL DEFAULT TRUE,
    "TcKimlikNo"           TEXT           NOT NULL DEFAULT '',
    "Address"              TEXT           NOT NULL DEFAULT '',
    "BirthDate"            TIMESTAMP      NULL,
    "Department"           TEXT           NOT NULL DEFAULT '',

    -- Foreign Key: Birincil Rol
    "RoleId"               UUID           NOT NULL,

    CONSTRAINT "PK_AspNetUsers" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AspNetUsers_AspNetRoles_RoleId"
        FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id")
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_AspNetUsers_RoleId"
    ON "AspNetUsers" ("RoleId");

CREATE INDEX IF NOT EXISTS "EmailIndex"
    ON "AspNetUsers" ("NormalizedEmail");

CREATE UNIQUE INDEX IF NOT EXISTS "UserNameIndex"
    ON "AspNetUsers" ("NormalizedUserName")
    WHERE "NormalizedUserName" IS NOT NULL;

-- 1.3 AspNetUserRoles (Identity M:N — Kullanıcı ↔ Rol)
CREATE TABLE IF NOT EXISTS "AspNetUserRoles" (
    "UserId"  UUID NOT NULL,
    "RoleId"  UUID NOT NULL,
    CONSTRAINT "PK_AspNetUserRoles" PRIMARY KEY ("UserId", "RoleId"),
    CONSTRAINT "FK_AspNetUserRoles_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_AspNetUserRoles_AspNetRoles_RoleId"
        FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_AspNetUserRoles_RoleId"
    ON "AspNetUserRoles" ("RoleId");

-- 1.4 AspNetUserClaims
CREATE TABLE IF NOT EXISTS "AspNetUserClaims" (
    "Id"         SERIAL       NOT NULL,
    "UserId"     UUID         NOT NULL,
    "ClaimType"  TEXT         NULL,
    "ClaimValue" TEXT         NULL,
    CONSTRAINT "PK_AspNetUserClaims" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AspNetUserClaims_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_AspNetUserClaims_UserId"
    ON "AspNetUserClaims" ("UserId");

-- 1.5 AspNetUserLogins
CREATE TABLE IF NOT EXISTS "AspNetUserLogins" (
    "LoginProvider"       TEXT NOT NULL,
    "ProviderKey"         TEXT NOT NULL,
    "ProviderDisplayName" TEXT NULL,
    "UserId"              UUID NOT NULL,
    CONSTRAINT "PK_AspNetUserLogins" PRIMARY KEY ("LoginProvider", "ProviderKey"),
    CONSTRAINT "FK_AspNetUserLogins_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_AspNetUserLogins_UserId"
    ON "AspNetUserLogins" ("UserId");

-- 1.6 AspNetUserTokens
CREATE TABLE IF NOT EXISTS "AspNetUserTokens" (
    "UserId"        UUID NOT NULL,
    "LoginProvider" TEXT NOT NULL,
    "Name"          TEXT NOT NULL,
    "Value"         TEXT NULL,
    CONSTRAINT "PK_AspNetUserTokens" PRIMARY KEY ("UserId", "LoginProvider", "Name"),
    CONSTRAINT "FK_AspNetUserTokens_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

-- 1.7 AspNetRoleClaims
CREATE TABLE IF NOT EXISTS "AspNetRoleClaims" (
    "Id"         SERIAL       NOT NULL,
    "RoleId"     UUID         NOT NULL,
    "ClaimType"  TEXT         NULL,
    "ClaimValue" TEXT         NULL,
    CONSTRAINT "PK_AspNetRoleClaims" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AspNetRoleClaims_AspNetRoles_RoleId"
        FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_AspNetRoleClaims_RoleId"
    ON "AspNetRoleClaims" ("RoleId");


-- =============================================================================
-- 2. UYGULAMA TABLOLARI
-- =============================================================================

-- 2.1 ExpertiseAreas (Uzmanlık Alanları)
CREATE TABLE IF NOT EXISTS "ExpertiseAreas" (
    "Id"             UUID      NOT NULL DEFAULT gen_random_uuid(),
    "ExpertiseName"  TEXT      NOT NULL DEFAULT '',
    "CreatedAt"      TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    "UpdatedAt"      TIMESTAMP NULL,
    "IsDeleted"      BOOLEAN   NOT NULL DEFAULT FALSE,
    CONSTRAINT "PK_ExpertiseAreas" PRIMARY KEY ("Id")
);

-- 2.2 UserExpertiseAreas (Junction: Users ↔ ExpertiseAreas — M:N)
CREATE TABLE IF NOT EXISTS "UserExpertiseAreas" (
    "ExpertiseAreasId" UUID NOT NULL,
    "TblUserListId"    UUID NOT NULL,
    CONSTRAINT "PK_UserExpertiseAreas" PRIMARY KEY ("ExpertiseAreasId", "TblUserListId"),
    CONSTRAINT "FK_UserExpertiseAreas_ExpertiseAreas"
        FOREIGN KEY ("ExpertiseAreasId") REFERENCES "ExpertiseAreas" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_UserExpertiseAreas_AspNetUsers"
        FOREIGN KEY ("TblUserListId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_UserExpertiseAreas_TblUserListId"
    ON "UserExpertiseAreas" ("TblUserListId");

-- 2.3 ProjectStatuses (Proje Durumları)
CREATE TABLE IF NOT EXISTS "ProjectStatuses" (
    "Id"          UUID      NOT NULL DEFAULT gen_random_uuid(),
    "StatusName"  TEXT      NOT NULL DEFAULT '',
    "CreatedAt"   TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    "UpdatedAt"   TIMESTAMP NULL,
    "IsDeleted"   BOOLEAN   NOT NULL DEFAULT FALSE,
    CONSTRAINT "PK_ProjectStatuses" PRIMARY KEY ("Id")
);

-- 2.4 Projects (Projeler)
CREATE TABLE IF NOT EXISTS "Projects" (
    "Id"              UUID      NOT NULL DEFAULT gen_random_uuid(),
    "ProjectName"     TEXT      NOT NULL DEFAULT '',
    "Description"     TEXT      NULL,
    "MainImageUrl"    TEXT      NULL,
    "ResourceFileUrl" TEXT      NULL,
    "StartDate"       TIMESTAMP NOT NULL,
    "EndDate"         TIMESTAMP NULL,
    "ApprovalStatus"  TEXT      NOT NULL DEFAULT 'Approved',
    "StatusId"        UUID      NOT NULL,
    "OwnerId"         UUID      NOT NULL,
    "CreatedAt"       TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    "UpdatedAt"       TIMESTAMP NULL,
    "IsDeleted"       BOOLEAN   NOT NULL DEFAULT FALSE,
    CONSTRAINT "PK_Projects" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Projects_ProjectStatuses_StatusId"
        FOREIGN KEY ("StatusId") REFERENCES "ProjectStatuses" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Projects_AspNetUsers_OwnerId"
        FOREIGN KEY ("OwnerId") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_Projects_StatusId"
    ON "Projects" ("StatusId");

CREATE INDEX IF NOT EXISTS "IX_Projects_OwnerId"
    ON "Projects" ("OwnerId");

-- 2.5 ProjectDocuments (Proje Belgeleri)
CREATE TABLE IF NOT EXISTS "ProjectDocuments" (
    "Id"            UUID      NOT NULL DEFAULT gen_random_uuid(),
    "FileName"      TEXT      NOT NULL DEFAULT '',
    "FileUrl"       TEXT      NOT NULL DEFAULT '',
    "Description"   TEXT      NULL,
    "FileType"      TEXT      NOT NULL DEFAULT 'other',
    "ProjectId"     UUID      NOT NULL,
    "UploadedById"  UUID      NOT NULL,
    "CreatedAt"     TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    "UpdatedAt"     TIMESTAMP NULL,
    "IsDeleted"     BOOLEAN   NOT NULL DEFAULT FALSE,
    CONSTRAINT "PK_ProjectDocuments" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_ProjectDocuments_Projects_ProjectId"
        FOREIGN KEY ("ProjectId") REFERENCES "Projects" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ProjectDocuments_AspNetUsers_UploadedById"
        FOREIGN KEY ("UploadedById") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_ProjectDocuments_ProjectId"
    ON "ProjectDocuments" ("ProjectId");

CREATE INDEX IF NOT EXISTS "IX_ProjectDocuments_UploadedById"
    ON "ProjectDocuments" ("UploadedById");

-- 2.6 ProjectWorkers (Junction: Users ↔ Projects — M:N + ek veri)
CREATE TABLE IF NOT EXISTS "ProjectWorkers" (
    "Id"          UUID      NOT NULL DEFAULT gen_random_uuid(),
    "ProjectId"   UUID      NOT NULL,
    "UserId"      UUID      NOT NULL,
    "ProjectRole" TEXT      NOT NULL DEFAULT '',
    "CreatedAt"   TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    "UpdatedAt"   TIMESTAMP NULL,
    "IsDeleted"   BOOLEAN   NOT NULL DEFAULT FALSE,
    CONSTRAINT "PK_ProjectWorkers" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_ProjectWorkers_Projects_ProjectId"
        FOREIGN KEY ("ProjectId") REFERENCES "Projects" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ProjectWorkers_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_ProjectWorkers_ProjectId"
    ON "ProjectWorkers" ("ProjectId");

CREATE INDEX IF NOT EXISTS "IX_ProjectWorkers_UserId"
    ON "ProjectWorkers" ("UserId");

-- 2.7 ProjectNotes (Proje Notları)
CREATE TABLE IF NOT EXISTS "ProjectNotes" (
    "Id"        UUID      NOT NULL DEFAULT gen_random_uuid(),
    "Content"   TEXT      NOT NULL DEFAULT '',
    "ProjectId" UUID      NOT NULL,
    "UserId"    UUID      NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    "UpdatedAt" TIMESTAMP NULL,
    "IsDeleted" BOOLEAN   NOT NULL DEFAULT FALSE,
    CONSTRAINT "PK_ProjectNotes" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_ProjectNotes_Projects_ProjectId"
        FOREIGN KEY ("ProjectId") REFERENCES "Projects" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ProjectNotes_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_ProjectNotes_ProjectId"
    ON "ProjectNotes" ("ProjectId");

CREATE INDEX IF NOT EXISTS "IX_ProjectNotes_UserId"
    ON "ProjectNotes" ("UserId");


-- =============================================================================
-- 3. DİLEKÇE TABLOLARI
-- =============================================================================

-- 3.1 Petitions (Dilekçeler)
CREATE TABLE IF NOT EXISTS "Petitions" (
    "Id"              UUID      NOT NULL DEFAULT gen_random_uuid(),
    "UserId"          UUID      NOT NULL,
    "Subject"         TEXT      NOT NULL DEFAULT '',
    "Title"           TEXT      NOT NULL DEFAULT '',
    "Content"         TEXT      NOT NULL DEFAULT '',
    "Status"          TEXT      NOT NULL DEFAULT 'Pending',
    "AttachmentsJson" TEXT      NOT NULL DEFAULT '[]',
    "CreatedAt"       TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    "UpdatedAt"       TIMESTAMP NULL,
    "IsDeleted"       BOOLEAN   NOT NULL DEFAULT FALSE,
    CONSTRAINT "PK_Petitions" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Petitions_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_Petitions_UserId"
    ON "Petitions" ("UserId");

-- 3.2 PetitionMessages (Dilekçe Mesajları)
CREATE TABLE IF NOT EXISTS "PetitionMessages" (
    "Id"         UUID      NOT NULL DEFAULT gen_random_uuid(),
    "PetitionId" UUID      NOT NULL,
    "AuthorId"   UUID      NOT NULL,
    "Content"    TEXT      NOT NULL DEFAULT '',
    "CreatedAt"  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    "UpdatedAt"  TIMESTAMP NULL,
    "IsDeleted"  BOOLEAN   NOT NULL DEFAULT FALSE,
    CONSTRAINT "PK_PetitionMessages" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_PetitionMessages_Petitions_PetitionId"
        FOREIGN KEY ("PetitionId") REFERENCES "Petitions" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_PetitionMessages_AspNetUsers_AuthorId"
        FOREIGN KEY ("AuthorId") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_PetitionMessages_PetitionId"
    ON "PetitionMessages" ("PetitionId");

CREATE INDEX IF NOT EXISTS "IX_PetitionMessages_AuthorId"
    ON "PetitionMessages" ("AuthorId");


-- =============================================================================
-- 4. CHAT (SOHBET) TABLOLARI
-- =============================================================================

-- 4.1 ChatRooms (Sohbet Odaları)
CREATE TABLE IF NOT EXISTS "ChatRooms" (
    "Id"          UUID      NOT NULL DEFAULT gen_random_uuid(),
    "Name"        TEXT      NULL,
    "IsGroup"     BOOLEAN   NOT NULL DEFAULT FALSE,
    "CreatedById" UUID      NOT NULL,
    "CreatedAt"   TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    "UpdatedAt"   TIMESTAMP NULL,
    "IsDeleted"   BOOLEAN   NOT NULL DEFAULT FALSE,
    CONSTRAINT "PK_ChatRooms" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_ChatRooms_AspNetUsers_CreatedById"
        FOREIGN KEY ("CreatedById") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_ChatRooms_CreatedById"
    ON "ChatRooms" ("CreatedById");

-- 4.2 ChatRoomMembers (Oda Üyeleri)
CREATE TABLE IF NOT EXISTS "ChatRoomMembers" (
    "Id"         UUID      NOT NULL DEFAULT gen_random_uuid(),
    "RoomId"     UUID      NOT NULL,
    "UserId"     UUID      NOT NULL,
    "Role"       TEXT      NOT NULL DEFAULT 'member',
    "LastReadAt" TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    "CreatedAt"  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    "UpdatedAt"  TIMESTAMP NULL,
    "IsDeleted"  BOOLEAN   NOT NULL DEFAULT FALSE,
    CONSTRAINT "PK_ChatRoomMembers" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_ChatRoomMembers_ChatRooms_RoomId"
        FOREIGN KEY ("RoomId") REFERENCES "ChatRooms" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ChatRoomMembers_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_ChatRoomMembers_RoomId_UserId"
    ON "ChatRoomMembers" ("RoomId", "UserId");

CREATE INDEX IF NOT EXISTS "IX_ChatRoomMembers_UserId"
    ON "ChatRoomMembers" ("UserId");

-- 4.3 ChatMessages (Sohbet Mesajları)
CREATE TABLE IF NOT EXISTS "ChatMessages" (
    "Id"             UUID      NOT NULL DEFAULT gen_random_uuid(),
    "RoomId"         UUID      NOT NULL,
    "SenderId"       UUID      NOT NULL,
    "Content"        TEXT      NOT NULL DEFAULT '',
    "AttachmentUrl"  TEXT      NULL,
    "AttachmentName" TEXT      NULL,
    "CreatedAt"      TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    "UpdatedAt"      TIMESTAMP NULL,
    "IsDeleted"      BOOLEAN   NOT NULL DEFAULT FALSE,
    CONSTRAINT "PK_ChatMessages" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_ChatMessages_ChatRooms_RoomId"
        FOREIGN KEY ("RoomId") REFERENCES "ChatRooms" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ChatMessages_AspNetUsers_SenderId"
        FOREIGN KEY ("SenderId") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_ChatMessages_RoomId_CreatedAt"
    ON "ChatMessages" ("RoomId", "CreatedAt");

CREATE INDEX IF NOT EXISTS "IX_ChatMessages_SenderId"
    ON "ChatMessages" ("SenderId");


-- =============================================================================
-- ÖZET: TOPLAM TABLO SAYISI
-- =============================================================================
-- Identity Tabloları (7):
--   1. AspNetRoles
--   2. AspNetUsers
--   3. AspNetUserRoles        (Junction: Users ↔ Roles)
--   4. AspNetUserClaims
--   5. AspNetUserLogins
--   6. AspNetUserTokens
--   7. AspNetRoleClaims
--
-- Uygulama Tabloları (7):
--   8. ExpertiseAreas
--   9. UserExpertiseAreas     (Junction: Users ↔ ExpertiseAreas)
--  10. ProjectStatuses
--  11. Projects
--  12. ProjectDocuments
--  13. ProjectWorkers         (Junction + ek veri: Users ↔ Projects)
--  14. ProjectNotes
--
-- Dilekçe Tabloları (2):
--  15. Petitions
--  16. PetitionMessages
--
-- Chat Tabloları (3):
--  17. ChatRooms
--  18. ChatRoomMembers
--  19. ChatMessages
-- =============================================================================
