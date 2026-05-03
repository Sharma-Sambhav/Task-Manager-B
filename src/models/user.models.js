import mongoose, {Schema} from "mongoose"
import jwt from 'jsonwebtoken'
import bcrypt from "bcrypt"

const userSchema = new Schema({
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    firstName:{
        type: String,
        required: true,
        trim: true,
    },
    lastName:{
        type: String,
        required: true,
        trim: true,
    },
    password:{
        type: String, 
        required: [true, "Password is Required"]
    },
    role:{
        type: String,
        enum: ["admin", "member"],
        default: "member"
    },
    status:{
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    }
}, 
{
    timestamps: true
})

userSchema.pre("save",async function (next) {
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function(){ 
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            role: this.role
        }, 
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "7d"
        }
    )
}

export const User = mongoose.model("User", userSchema)
