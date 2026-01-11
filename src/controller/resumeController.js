const PDFDocument = require('pdfkit');
const docx = require('docx');
const { Document, Paragraph, TextRun } = docx;
const fs = require('fs');
const path = require('path');
const Resume = require('../models/resumeModel');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { google } = require('googleapis');


const addHistoryEntry = async (resume, action, changes = null, templateId = null) => {
  const historyEntry = {
    action,
    timestamp: new Date(),
    changes
  };
  if (templateId) {
    historyEntry.templateId = templateId;
  }
  resume.history.push(historyEntry);
  await resume.save();
};


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const drive = google.drive({ version: 'v3', auth: oauth2Client });


exports.getUserResumes = async (req, res) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      console.error('User ID missing from request:', req.user);
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log(`Fetching resumes for user: ${userId}`);
    
    const resumes = await Resume.find({ userId })
      .sort({ updatedAt: -1 })
      .select('templateId personalInfo history createdAt updatedAt content')
      .lean();

    console.log(`Found ${resumes?.length || 0} resumes for user ${userId}`);
    if (!resumes || resumes.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }


    const processedResumes = resumes.map(resume => ({
      ...resume,
      history: resume.history || [],
      personalInfo: resume.personalInfo || {},
      templateId: resume.templateId || '1',
      createdAt: resume.createdAt || new Date(),
      updatedAt: resume.updatedAt || resume.createdAt || new Date()
    }));

    res.status(200).json({
      success: true,
      data: processedResumes
    });
  } catch (error) {
    console.error('Get user resumes error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id
    });
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error fetching user resumes',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};


exports.getResume = async (req, res) => {
  try {
    const userId = req.user._id;
    const resume = await Resume.findOne({ userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    res.status(200).json({
      success: true,
      data: resume
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching resume',
      error: error.message
    });
  }
};


exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const userId = req.user._id;
    let content = '';
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdf(dataBuffer);
      content = data.text;
    } else if (ext === '.doc' || ext === '.docx') {
      const dataBuffer = fs.readFileSync(req.file.path);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      content = result.value;
    }

    let resume = await Resume.findOne({ userId });
    
    if (resume) {
      resume.content = content;
      await resume.save();
    } else {
      resume = await Resume.create({
        userId,
        content
      });
    }

    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    res.status(200).json({
      success: true,
      message: 'Resume uploaded and processed successfully',
      data: resume
    });

  } catch (error) {
    console.error('Upload resume error:', error);
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error uploading resume',
      error: error.message
    });
  }
};

exports.uploadToGoogleDocs = async (req, res) => {
  try {
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
      console.error('Google credentials not configured');
      return res.status(500).json({
        success: false,
        message: 'Google Drive integration not configured'
      });
    }

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    console.log('Uploading file:', {
      name: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const fileMetadata = {
      name: req.file.originalname,
      mimeType: 'application/vnd.google-apps.document'
    };

    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(req.file.path)
    };

    console.log('Creating file in Google Drive...');
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    console.log('File created:', file.data);

    console.log('Setting file permissions...');
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'writer',
        type: 'anyone'
      }
    });

    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });
  
    if (req.user?._id) {
      const resume = await Resume.findOne({ userId: req.user._id });
      if (resume) {
        resume.googleDocId = file.data.id;
        resume.googleDocUrl = file.data.webViewLink;
        await resume.save();
      }
    }

    console.log('Upload successful');
    res.status(200).json({
      success: true,
      fileId: file.data.id,
      webViewLink: file.data.webViewLink
    });

  } catch (error) {
    console.error('Google Docs upload error:', {
      error: error.message,
      stack: error.stack,
      file: req.file
    });

 
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    }

  
    const errorMessage = error.code === 401 ? 
      'Google authorization failed. Please check credentials.' :
      'Error uploading to Google Docs. Please try again.';

    res.status(error.code === 401 ? 401 : 500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


exports.downloadPdf = async (req, res) => {
  try {
    const { content, templateId } = req.body;
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    const doc = new PDFDocument();
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', async () => {
      const result = Buffer.concat(chunks);
      

      const resume = await Resume.findOne({ userId, templateId });
      if (resume) {
        await addHistoryEntry(resume, 'downloaded_pdf', null, templateId);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
      res.send(result);
    });

    doc.fontSize(12);
    doc.text(content, {
      align: 'left',
      lineGap: 5
    });

    doc.end();
  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PDF',
      error: error.message
    });
  }
};


exports.downloadDoc = async (req, res) => {
  try {
    const { content, templateId } = req.body;
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: content,
                size: 24
              })
            ]
          })
        ]
      }]
    });

    const buffer = await docx.Packer.toBuffer(doc);
    
    const resume = await Resume.findOne({ userId, templateId });
    if (resume) {
      await addHistoryEntry(resume, 'downloaded_doc', null, templateId);
    }
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=resume.docx');
    res.send(buffer);

  } catch (error) {
    console.error('Download DOC error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating DOC',
      error: error.message
    });
  }
};


exports.saveResume = async (req, res) => {
  try {
    const { content, templateId, personalInfo } = req.body;
    const userId = req.user._id;

    if (!content || !templateId) {
      return res.status(400).json({
        success: false,
        message: 'Content and templateId are required'
      });
    }

    let resume = await Resume.findOne({ userId, templateId });
    const isNew = !resume;
    
    if (resume) {
      const changes = {
        previousContent: resume.content,
        newContent: content
      };
      resume.content = content;
      resume.personalInfo = personalInfo;
      await resume.save();
      await addHistoryEntry(resume, 'updated', changes, templateId);
    } else {
      resume = await Resume.create({
        userId,
        content,
        templateId,
        personalInfo,
        history: [{
          action: 'created',
          templateId,
          timestamp: new Date()
        }]
      });
    }

    res.status(200).json({
      success: true,
      message: isNew ? 'Resume created successfully' : 'Resume updated successfully',
      data: resume
    });

  } catch (error) {
    console.error('Save resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving resume',
      error: error.message
    });
  }
};