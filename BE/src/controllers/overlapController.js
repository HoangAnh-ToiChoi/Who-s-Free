import * as overlapService from '../services/overlapService.js';

export const getCalendarOverlap = async (req, res, next) => {
  try {
    const { calendarId } = req.params;
    const userId = req.user.id;

    const data = await overlapService.getCalendarOverlapService(calendarId, userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getSuggestedTimes = async (req, res, next) => {
  try {
    const { calendarId } = req.params;
    const userId = req.user.id;

    const data = await overlapService.getSuggestedTimesService(calendarId, userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const updateVisibility = async (req, res, next) => {
  try {
    const { calendarId } = req.params;
    const { is_visibility_on } = req.body;
    const userId = req.user.id;

    if (typeof is_visibility_on !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'is_visibility_on phải là boolean (true/false)' }
      });
    }

    const data = await overlapService.updateCalendarVisibilityService(calendarId, userId, is_visibility_on);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const finalizeMeeting = async (req, res, next) => {
  try {
    const { calendarId } = req.params;
    const { title, start_time, end_time, location_or_link } = req.body;
    const userId = req.user.id;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Vui lòng điền tiêu đề và khung giờ chốt họp' }
      });
    }

    const data = await overlapService.finalizeMeetingService(calendarId, userId, title, start_time, end_time, location_or_link);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};