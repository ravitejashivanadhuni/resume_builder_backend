const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const transPorter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER ,
    pass: process.env.MAIL_PASS ,
  },
});

async function senData(to, subject, html) {
  try {
    const mailFormat = {
      from: process.env.MAIL_USER,
      to: to,
      subject: subject,
      html: html,
    };
    
    const info = await transPorter.sendMail(mailFormat);
    console.log("Email sent successfully:", {
      to: to,
      subject: subject,
      messageId: info.messageId,
      response: info.response
    });
    return true;
  } catch (error) {
    console.error("Error sending email:", {
      to: to,
      subject: subject,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = senData;
