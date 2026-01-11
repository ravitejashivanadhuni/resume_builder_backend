const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'updated', 'downloaded_pdf', 'downloaded_doc'],
    required: true
  },
  templateId: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  changes: {
    type: Object
  }
});

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auth',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  templateId: {
    type: String,
    required: true
  },
  personalInfo: {
    fullName: String,
    jobTitle: String,
    email: String,
    phone: String,
    location: String
  },
  history: [historySchema],
  pdfUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


resumeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Resume', resumeSchema); 