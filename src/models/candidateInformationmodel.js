const { Schema, default: mongoose, model } = require("mongoose");


const candidateinfo=  new Schema({
    first_Name: {
        type:String
    },
    last_Name:{
        type:String
    },
    email:{
        type:String,
       
    },
    birth_Date:{
        type:Date,
    },
    gender:{
       type:String,
       enum:['male','female','other']
    },
    phoneNumber:{
        type:String
    },
    address:{
        type:String
    },
    graduation:{
        type:String,
    },
    skill: [
      {
        type: String, 
        trim: true,  
      },
    ],
    role:{
       type:String
    },
    file:{
       type:String
    },
    profile:{
        type:String
    },
    createdEmail:{
          type: String, ref: 'Auth' ,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auth' },
},{timestamps:true})


candidateinfo.pre("remove", async function (next) {
    try {
      await mongoose.model("Interview").deleteMany({ candidateId: this._id });
      next();
    } catch (error) {
      next(error);
    }
  });
const Candidate=model("candidateInformation",candidateinfo)
module.exports=Candidate