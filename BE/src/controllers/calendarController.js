import * as calendarService from '../services/calendarService.js';
import * as availabilityService from '../services/availabilityService.js';

export const createCalendar = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { title, start_date, end_date } = req.body;
    const userId = req.user.id;

    if (!title || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Thiếu tiêu đề hoặc khoảng thời gian của Calendar' }
      });
    }

    const calendar = await calendarService.createCalendarService(groupId, userId, title, start_date, end_date);
    res.status(201).json({ success: true, data: calendar });
  } catch (error) {
    next(error);
  }
};

export const getCalendarsByGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const calendars = await calendarService.getCalendarsByGroupService(groupId, userId);
    res.status(200).json({ success: true, data: calendars });
  } catch (error) {
    next(error);
  }
};

export const createAvailability = async (req, res, next) => {
  try {
    const { calendarId } = req.params;
    const { start_time, end_time, note } = req.body;
    const userId = req.user.id;

    if (!start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Thiếu thời gian bắt đầu hoặc kết thúc' }
      });
    }

    const result = await availabilityService.createAvailabilityService(calendarId, userId, start_time, end_time, note);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getMyAvailability = async (req, res, next) => {
  try {
    const { calendarId } = req.params;
    const userId = req.user.id;

    const list = await availabilityService.getMyAvailabilityService(calendarId, userId);
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

export const updateAvailability = async (req, res, next) => {
  try {
    const { availabilityId } = req.params;
    const { start_time, end_time, note } = req.body;
    const userId = req.user.id;

    const updated = await availabilityService.updateAvailabilityService(availabilityId, userId, start_time, end_time, note);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteAvailability = async (req, res, next) => {
  try {
    const { availabilityId } = req.params;
    const userId = req.user.id;

    const result = await availabilityService.deleteAvailabilityService(availabilityId, userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};