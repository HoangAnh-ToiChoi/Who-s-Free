-- ==============================================================================
-- WHO'S FREE - DATABASE SCHEMA (SUPABASE / POSTGRESQL)
-- Kiến trúc quan hệ N-N (Many-to-Many), tối ưu bảo trì và mở rộng lâu dài.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. BẢNG USERS (Người dùng)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    refresh_token TEXT,
    refresh_token_created_at TIMESTAMPTZ,
    notifications_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_refresh_token ON users(refresh_token);

-- ==============================================================================
-- 3. BẢNG GROUPS (Không gian làm việc / Nhóm)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) DEFAULT 'work', -- 'work' | 'hangout' | 'other'
    description TEXT,
    icon VARCHAR(50) DEFAULT 'Users',
    color VARCHAR(50) DEFAULT 'indigo',
    capacity INT DEFAULT 10,
    cohort VARCHAR(50) DEFAULT '2026',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. BẢNG GROUP_MEMBERS (Quan hệ N-N giữa Users & Groups)
-- 1 User có thể tham gia nhiều Group; 1 Group chứa nhiều User với Role riêng biệt
-- ==============================================================================
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'owner' | 'lead' | 'member'
    group_role VARCHAR(50) DEFAULT 'core',      -- 'leadership' | 'core' | 'guest' (Dùng cho Bộ lọc Leader Heatmap)
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- ==============================================================================
-- 5. BẢNG GROUP_INVITATIONS (Lời mời tham gia nhóm qua email - Hạn 24 giờ)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS group_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'member' | 'lead'
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'revoked'
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng cũ group_invites để tương thích ngược nếu cần
CREATE TABLE IF NOT EXISTS group_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    invite_code VARCHAR(100) UNIQUE NOT NULL,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 6. BẢNG SESSIONS (Phiên khảo sát / Lịch trình họp nhóm)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    slug VARCHAR(255) UNIQUE NOT NULL,
    ref_code VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    tag VARCHAR(100) DEFAULT 'CÔNG VIỆC & HỌC TẬP',
    tag_color VARCHAR(50) DEFAULT 'primary',
    date_range VARCHAR(150),
    scheduled_time VARCHAR(150) DEFAULT 'Flexible Window',
    location VARCHAR(255) DEFAULT 'Quán Cafe / Trực tuyến',
    status VARCHAR(50) DEFAULT 'active_poll', -- 'active_poll' | 'finalized' | 'closed'
    finalized_at TIMESTAMPTZ,
    finalized_by UUID REFERENCES users(id) ON DELETE SET NULL,
    finalized_date DATE,
    finalized_start_minutes SMALLINT,
    finalized_end_minutes SMALLINT,
    export_note TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. BẢNG SESSION_PARTICIPANTS (Quan hệ N-N giữa Users & Sessions)
-- Theo dõi trạng thái phản hồi của từng thành viên trong phiên khảo sát
-- ==============================================================================
CREATE TABLE IF NOT EXISTS session_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'responded' | 'declined'
    responded_at TIMESTAMPTZ,
    UNIQUE(session_id, user_id)
);

-- ==============================================================================
-- 8. BẢNG AVAILABILITY_SLOTS (Khung giờ rảnh kéo thả từ Lưới Ma Trận)
-- Tối ưu cho thao tác kéo-thả: Lưu toạ độ phút (start_minutes, end_minutes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS availability_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_index SMALLINT NOT NULL CHECK (day_index >= 0 AND day_index <= 6), -- 0: Thứ 2 ... 6: Chủ nhật
    date_str DATE NOT NULL,
    start_minutes SMALLINT NOT NULL CHECK (start_minutes >= 0 AND start_minutes <= 1440),
    end_minutes SMALLINT NOT NULL CHECK (end_minutes > start_minutes AND end_minutes <= 1440),
    label VARCHAR(100) DEFAULT 'Available',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. INDEXES TỐI ƯU TRUY VẤN & TÍNH TOÁN MA TRẬN HEATMAP
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_group ON sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_sessions_slug ON sessions(slug);
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_avail_slots_session_user ON availability_slots(session_id, user_id);
CREATE INDEX IF NOT EXISTS idx_avail_slots_session_day ON availability_slots(session_id, day_index);
CREATE INDEX IF NOT EXISTS idx_group_invitations_token_hash ON group_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_group_invitations_group_status ON group_invitations(group_id, status);
CREATE INDEX IF NOT EXISTS idx_group_invitations_email ON group_invitations(email);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) - BẢO MẬT & PHÂN QUYỀN TRUY CẬP DỮ LIỆU
-- ==============================================================================

-- Kích hoạt RLS trên tất cả các bảng nghiệp vụ
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- 10.1. Policies cho USERS:
-- Ai cũng có thể đọc profile công khai, chỉ chính chủ mới được sửa thông tin
CREATE POLICY "Users can view all profiles" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 10.2. Policies cho GROUPS:
-- Chỉ thành viên trong nhóm mới được xem thông tin nhóm
CREATE POLICY "Members can view their groups" ON groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
        )
    );

-- Người dùng đã đăng nhập có thể tạo nhóm mới
CREATE POLICY "Authenticated users can create groups" ON groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Chỉ Owner mới được cập nhật hoặc xóa nhóm
CREATE POLICY "Owners can update their groups" ON groups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'owner'
        )
    );

-- 10.3. Policies cho GROUP_MEMBERS:
-- Thành viên được xem danh sách thành viên cùng nhóm
CREATE POLICY "Members can view group membership" ON group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
        )
    );

-- 10.4. Policies cho SESSIONS:
-- Thành viên của nhóm chứa session mới được xem session
CREATE POLICY "Group members can view sessions" ON sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = sessions.group_id
            AND group_members.user_id = auth.uid()
        )
    );

-- Thành viên của nhóm có thể tạo session
CREATE POLICY "Group members can create sessions" ON sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = sessions.group_id
            AND group_members.user_id = auth.uid()
        )
    );

-- 10.5. Policies cho AVAILABILITY_SLOTS:
-- Thành viên nhóm có thể xem các slot rảnh trong session
CREATE POLICY "Group members can view availability slots" ON availability_slots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = availability_slots.session_id
            AND gm.user_id = auth.uid()
        )
    );

-- CHỐNG BYPASS: Người dùng CHỈ ĐƯỢC chèn/sửa/xóa slot của chính họ (auth.uid() = user_id)
CREATE POLICY "Users can only manage their own slots" ON availability_slots
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

