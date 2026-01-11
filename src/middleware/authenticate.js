const Auth = require("../models/authmodel");
const jwt=require("jsonwebtoken");

exports.auth = async (req, res, next) => {
    try {
      
      const token = req.cookies['interview_ai'] || req.headers.authorization?.split(' ')[1];
  
      if (!token) {
        return res.status(401).json({ success: false, message: 'Authorization denied, no token provided' });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
     
      let user = await Auth.findById(decoded.userId);  
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
  
      
      req.user = user;
      next();
    } catch (error) {
      
      
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  };


  exports.IsRecruiter = (req, res, next) => {
      
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized, no user found" });
    }
  
    
    if (req.user.role === "recruiter") {
      next();
    } else {
     
      
      return res.status(403).json({ success: false, message: "You are not authorized to access this resource" });
    }
  };