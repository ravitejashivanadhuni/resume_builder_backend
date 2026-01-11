const bcrypt=require("bcryptjs")
exports.hash =async (password) =>{
    const gensalt=await bcrypt.genSalt(10);
    return  await bcrypt.hash(password,gensalt)
}