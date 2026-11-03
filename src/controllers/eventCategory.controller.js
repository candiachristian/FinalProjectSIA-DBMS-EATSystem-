const EventCategory = require('../models/eventCategory.model');

async function getCategories(req, res) {
  try {
    const categories = await EventCategory.listCategories();

    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get event categories error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not load event categories.',
      data: null
    });
  }
}

module.exports = {
  getCategories
};
