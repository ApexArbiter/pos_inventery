import User from "../models/user.model.js";
import Message from "../models/message.model.js";
export const getUserForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.param;
    const myId = req.user._id;

    const messages = await Message.find({
        $or:[
            {
            senderId:myId,
            receiverId:userToChatId
        },
        {
            senderId:userToChatId,
            receiverId:myId
        }
    ]
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
    try {
        const {text,image}= req.body
        const  {id:receiverId} = req.params
        const senderId = req.user._id
let imageUrl
if(image){
    const uploadResponse = await cloudinary.uploader.upload(image)
    imageUrl = uploadResponse.secure_url
    const newMessage = await Message.create({
        senderId,
        receiverId,
        text,
        image:imageUrl
    })
    newMessage.save()
    res.status(200).json(newMessage)

    // socket.io will be used later fot the realetime chat
}


    } catch (error) {
        
    }
};