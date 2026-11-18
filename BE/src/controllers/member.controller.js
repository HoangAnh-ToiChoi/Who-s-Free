import BaseController from "./BaseController.js";
import MemberModel from "../models/member.model.js";

class MemberController extends BaseController {
  /** GET /api/members - Danh sách thành viên */
  async getAll(req, res) {
    const members = await MemberModel.findAll();
    return this.sendSuccess(res, members, "Lấy danh sách thành viên thành công");
  }
}

export default new MemberController();
