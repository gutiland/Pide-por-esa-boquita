import User from "../Model/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const registerUser=async(req,res,next)=>{
    try {
        
        const { name, email, pub, password} = req.body
        const isUser = await User.findOne({email: email})
        if(isUser){
            return res.status(409).json("el usuario ya existe")
        }
        const hashedPassword = await bcrypt.hash(password, 12)
        const newUser=await User.create({
            name:name,
            email:email,
            pub:pub,
            password:hashedPassword
        })


        return res.status(201).json({
            message:"usuario creado"
        })
    } catch (error) {
        return res.status(400).json(error.message)

    }
}

const loginUser=async(req,res,next)=>{
    try{ 
        const {email, password} = req.body
        const user = await User.findOne({email:email})
        if(!user){
            return res.status(401).json("usuario o contraseña incorrecto")
        }

        const validPassword = await bcrypt.compare(password, user.password)

        if(!validPassword){
            return res.status(401).json("usuario o contraseña incorrecto")
        
        }
        const token = jwt.sign(
            {userId:user._id.toString()},
            process.env.JWT_SECRET,
            {expiresIn: "24h"}
        )
        return res.status(200).json({
            message:"login realizado",
            token
        })
    } catch (error) {
        return res.status(400).json(error.message)

    }
}
 const getMe=async(req,res,next)=>{
    try{ 
        const user = await User.findById(req.userId).select("-password")
        if(!user){
            return res.status(401).json({
                message: "no encontrado"
            })
        }

        return res.status(200).json(user)
    } catch (error) {
        return res.status(400).json(error.message)

    }
}

export {registerUser, loginUser, getMe}