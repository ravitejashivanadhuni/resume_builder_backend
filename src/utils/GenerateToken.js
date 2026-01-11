const jwt=require("jsonwebtoken");
exports.generateToeken = (userId,res)=>{
    const token= jwt.sign({
        userId,
        
    },
    process.env.JWT_SECRET,
    {expiresIn:"5d"})

   res.cookie("interview_ai", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", 
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", 
      maxAge: 30 * 24 * 60 * 60 * 1000, 
    });

    return token;
}
