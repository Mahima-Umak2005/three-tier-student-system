const Student = require('../models/Student');

const FIELDS = ['studentId', 'name', 'email', 'department', 'semester', 'contact'];
const pick = (body) => Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Turns Mongoose errors into safe client messages (no server internals leaked)
function handleError(res, err) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'A student with this Student ID already exists' });
  }
  console.error(err);
  return res.status(500).json({ success: false, message: 'Something went wrong on the server' });
}

exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.search) {
      const rx = new RegExp(escapeRegex(String(req.query.search).slice(0, 50)), 'i');
      filter.$or = [{ studentId: rx }, { name: rx }, { email: rx }, { department: rx }];
    }
    const students = await Student.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: students.length, data: students });
  } catch (e) { handleError(res, e); }
};

exports.getOne = async (req, res) => {
  try {
    const s = await Student.findOne({ studentId: req.params.id.toUpperCase() });
    if (!s) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: s });
  } catch (e) { handleError(res, e); }
};

exports.create = async (req, res) => {
  try {
    const s = await Student.create(pick(req.body));
    res.status(201).json({ success: true, message: 'Student added successfully', data: s });
  } catch (e) { handleError(res, e); }
};

exports.update = async (req, res) => {
  try {
    const updates = pick(req.body);
    delete updates.studentId; // ID is the record key and cannot change
    const s = await Student.findOneAndUpdate(
      { studentId: req.params.id.toUpperCase() }, updates, { new: true, runValidators: true }
    );
    if (!s) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, message: 'Student updated successfully', data: s });
  } catch (e) { handleError(res, e); }
};

exports.remove = async (req, res) => {
  try {
    const s = await Student.findOneAndDelete({ studentId: req.params.id.toUpperCase() });
    if (!s) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (e) { handleError(res, e); }
};
