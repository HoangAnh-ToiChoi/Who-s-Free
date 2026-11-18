import { z } from "zod";

// Câu báo lỗi mặc định của Zod bằng tiếng Việt: trường nào chưa viết câu riêng cũng không lọt tiếng Anh ra người dùng
z.config(z.locales.vi());
