const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String, required: true, trim: true, lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address']
    },
    department: { type: String, required: true, trim: true, maxlength: 100 },
    semester: { type: Number, required: true, min: 1, max: 12 },
    contact: { type: String, trim: true, match: [/^\d{10}$/, 'Contact must be 10 digits'] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema, 'students');
