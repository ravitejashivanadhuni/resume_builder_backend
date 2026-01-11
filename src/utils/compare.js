const bcrypt=require("bcryptjs")
exports.compare =async (password,comparepassword) =>{
    return await bcrypt.compare(password,comparepassword);
}