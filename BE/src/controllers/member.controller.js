import { sendSuccess } from "./response.controller.js";
import MemberModel from "../models/member.model.js";

class MemberController {
  /** GET /api/members - Danh sách thành viên */
  async getAll(req, res) {
    const members = await MemberModel.findAll();
    return sendSuccess(res, members, "Lấy danh sách thành viên thành công");
  }
}

export default new MemberController();
