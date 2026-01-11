const { register, logout, SendOtp, verifyOtp, login , ResetPassword, getProfile, updateProfile, deleteProfilePhoto, loginWithGoogle, SendEmailCode, verifyEmailCode, getAllUser, signupWithGoogle } = require("../controller/authcontroller");
const { auth } = require("../middleware/authenticate");
const upload = require("../middleware/uploadMiddleware");

const router=require("express").Router();


router.post("/register",register)
router.post("/login", login);
router.post("/login-with-google", loginWithGoogle)
router.post("/signup-with-google",signupWithGoogle)
router.post("/send-code",SendEmailCode)
router.post("/verify-code",verifyEmailCode)
router.post("/sendotp",SendOtp)
router.post("/verify",verifyOtp)
router.post("/resetpassword",ResetPassword)
router.get("/logout",auth,logout)
router.get("/profile", auth, getProfile);
router.put("/profile/update", auth, upload.single('profilePhoto'), updateProfile);
router.post("/profile/upload-photo", auth, upload.single('profilePhoto'), updateProfile);
router.delete("/profile/photo", auth, deleteProfilePhoto);
router.get("/getalluser",getAllUser)

module.exports = router;