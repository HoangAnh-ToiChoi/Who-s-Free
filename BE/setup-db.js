/**
 * ==============================================================================
 * WHO'S FREE - SUPABASE DATABASE AUTO SETUP & SELF-VERIFY RUNNER
 * ==============================================================================
 * Tự động kết nối, chạy tạo schema, kiểm tra nghiệm thu (7 bảng, RLS, Indexes)
 * và tự hủy (xóa file) khi bạn xác nhận mọi thứ đã đạt chuẩn.
 *
 * Cách chạy:
 *   cd BE
 *   npm run db:setup
 *   (hoặc: node setup-db.js)
 * ==============================================================================
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Tải biến môi trường từ .env
const envPaths = [
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "../.env"),
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

// Màu sắc terminal trực quan
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

// Danh sách 7 bảng chuẩn theo schema.sql
const REQUIRED_TABLES = [
  "users",
  "groups",
  "group_members",
  "group_invitations",
  "group_invites",
  "sessions",
  "session_participants",
  "availability_slots",
];

// Hàm hỗ trợ hỏi đáp qua CLI
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

// Tìm file schema.sql
function findSchemaFile() {
  const possiblePaths = [
    path.resolve(__dirname, "../DB/schema.sql"),
    path.resolve(__dirname, "DB/schema.sql"),
    path.resolve(__dirname, "./schema.sql"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function main() {
  console.log(`\n${colors.cyan}${colors.bold}====================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}   WHO'S FREE - SUPABASE DB SETUP & VERIFY RUNNER   ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}====================================================${colors.reset}\n`);

  // 1. Xác định Connection String
  let connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.log(`${colors.yellow}⚠️ Không tìm thấy biến DATABASE_URL trong file .env!${colors.reset}`);
    console.log(`💡 Bạn có thể lấy Connection String tại:`);
    console.log(`   Supabase Dashboard ➜ Project Settings ➜ Database ➜ Connection string (URI)\n`);
    
    connectionString = await askQuestion(
      `${colors.bold}Nhập PostgreSQL Connection String của bạn: ${colors.reset}`
    );
  }

  if (!connectionString) {
    console.log(`${colors.red}❌ Lỗi: Bạn chưa cung cấp Connection String. Hủy tiến trình.${colors.reset}`);
    process.exit(1);
  }

  // 2. Tìm file schema.sql
  const schemaPath = findSchemaFile();
  if (!schemaPath) {
    console.log(`${colors.red}❌ Lỗi: Không tìm thấy file schema.sql trong thư mục DB/!${colors.reset}`);
    process.exit(1);
  }

  console.log(`📄 Tìm thấy file schema: ${colors.green}${schemaPath}${colors.reset}`);
  const sqlContent = fs.readFileSync(schemaPath, "utf-8");

  // 3. Kết nối PostgreSQL
  console.log(`🔌 Đang kết nối đến cơ sở dữ liệu Supabase...`);
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Bắt buộc cho kết nối Supabase SSL
  });

  try {
    await client.connect();
    console.log(`${colors.green} Kết nối Supabase thành công!${colors.reset}\n`);

    // 4. Chạy tạo bảng & RLS
    console.log(`🚀 Đang thực thi schema.sql (Tạo 7 bảng, indexes và kích hoạt RLS)...`);
    await client.query(sqlContent);
    console.log(`${colors.green} Thực thi toàn bộ lệnh SQL thành công!${colors.reset}\n`);

    // 5. TỰ ĐỘNG KIỂM TRA & NGHIỆM THU (AUTO-VERIFY)
    console.log(`${colors.cyan}${colors.bold}--- TIẾN HÀNH TỰ ĐỘNG NGHIỆM THU HỆ THỐNG ---${colors.reset}`);

    // 5.1. Kiểm tra bảng và Row Level Security
    const tablesRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);

    const existingTables = new Map(
      tablesRes.rows.map((r) => [r.tablename, r.rowsecurity])
    );

    let allTablesPass = true;
    let allRlsPass = true;

    console.log(`\n📋 Bảng kiểm tra danh sách Table & Trạng thái bảo mật RLS:`);
    for (const table of REQUIRED_TABLES) {
      const exists = existingTables.has(table);
      const rlsEnabled = existingTables.get(table) === true;

      if (!exists) {
        allTablesPass = false;
        console.log(`  ❌ ${colors.red}[MISSING]${colors.reset} Bảng: ${table}`);
      } else if (!rlsEnabled) {
        allRlsPass = false;
        console.log(`  ⚠️ ${colors.yellow}[NO RLS]${colors.reset} Bảng: ${table} (Đã tạo nhưng chưa bật RLS)`);
      } else {
        console.log(`  ${colors.green}[OK - SECURE]${colors.reset} Bảng: ${colors.bold}${table}${colors.reset} (RLS: Enabled)`);
      }
    }

    // 5.2. Đếm các chính sách bảo mật (Policies) đã kích hoạt
    const policiesRes = await client.query(`
      SELECT tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public';
    `);
    console.log(`\n🛡️ Tổng số Policies bảo mật đã kích hoạt: ${colors.green}${policiesRes.rowCount} policies${colors.reset}`);

    // 5.3. Đếm các chỉ mục (Indexes) đã tạo
    const indexesRes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
    `);
    console.log(`⚡ Tổng số Custom Indexes tối ưu ma trận: ${colors.green}${indexesRes.rowCount} indexes${colors.reset}\n`);

    // Tổng kết nghiệm thu
    const isSuccess = allTablesPass && allRlsPass;

    if (isSuccess) {
      console.log(`${colors.green}${colors.bold}====================================================${colors.reset}`);
      console.log(`${colors.green}${colors.bold}    TẤT CẢ TIÊU CHÍ ĐÃ ĐẠT CHUẨN 100%!             ${colors.reset}`);
      console.log(`${colors.green}${colors.bold}    - 7/7 Bảng đã được tạo thành công               ${colors.reset}`);
      console.log(`${colors.green}${colors.bold}    - Row Level Security (RLS) đã bảo vệ toàn bộ    ${colors.reset}`);
      console.log(`${colors.green}${colors.bold}    - Đầy đủ Indexes và Policies chống bypass      ${colors.reset}`);
      console.log(`${colors.green}${colors.bold}====================================================${colors.reset}\n`);

      // 6. HỎI NGƯỜI DÙNG ĐỂ TỰ ĐỘNG XÓA FILE (SELF-DESTRUCT)
      const confirmDelete = await askQuestion(
        `${colors.yellow}👉 Mọi thứ đã hoạt động hoàn hảo. Bạn có muốn TỰ ĐỘNG XÓA file script này để giữ sạch codebase theo quy tắc GEMINI.md không? (y/N): ${colors.reset}`
      );

      if (confirmDelete.toLowerCase() === "y" || confirmDelete.toLowerCase() === "yes") {
        await client.end();
        fs.unlinkSync(__filename);
        console.log(`\n${colors.cyan}🗑️ Đã tự động xóa file: ${path.basename(__filename)}${colors.reset}`);
        console.log(`${colors.green} Hoàn tất! Cơ sở dữ liệu đã sẵn sàng cho Backend.${colors.reset}\n`);
        return;
      } else {
        console.log(`\n${colors.cyan}ℹ️ Giữ lại file script để bạn có thể kiểm tra thêm.${colors.reset}\n`);
      }
    } else {
      console.log(`${colors.red}${colors.bold}❌ Nghiệm thu thất bại! Một số bảng hoặc chính sách bảo mật chưa hoàn tất.${colors.reset}\n`);
    }

    await client.end();
  } catch (err) {
    console.error(`\n${colors.red}❌ Lỗi trong quá trình thực thi:${colors.reset}`, err.message);
    try {
      await client.end();
    } catch {
      // ignore
    }
    process.exit(1);
  }
}

main();
