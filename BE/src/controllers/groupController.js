import * as groupService from '../services/groupService.js';

export const createGroup = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Tên nhóm không được để trống' }
      });
    }

    const group = await groupService.createGroupService(userId, name, description);
    res.status(201).json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};

export const getUserGroups = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const groups = await groupService.getUserGroupsService(userId);
    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    next(error);
  }
};

export const joinGroupByCode = async (req, res, next) => {
  try {
    const { invite_code } = req.body;
    const userId = req.user.id;

    if (!invite_code) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Mã mời không được để trống' }
      });
    }

    const result = await groupService.joinGroupByCodeService(userId, invite_code.trim());
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};