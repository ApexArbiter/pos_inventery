import mongoose from "mongoose";

export const connectdb = async ()=>{
    try{
        const conn = await mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB Connected:",conn.connection.host)
    }catch(err){
console.log("DB connection error",err)
    }
}