import { BASE_API_URL } from "../../config/api"; // Fixed typo
import { CREATE_NEW_MESSAGE, GET_ALL_MESSAGE } from "./ActionType";

// Action for creating a new message
export const createMessage = (messageData) => async (dispatch) => {
    try {
        const res = await fetch(`${BASE_API_URL}/api/messages/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${messageData.token}`, // Ensure token is valid
            },
            body: JSON.stringify(messageData.data),
        });
        if (!messageData || !messageData.token || !messageData.data) {
            console.error("Invalid messageData:", messageData);
            return;
        }
        

        // Check if the response is ok (status code in the range 200-299)
        if (!res.ok) {
            const errorData = await res.json();
            console.error("Error creating message:", res.status, errorData);
            throw new Error(`Error: ${errorData.message || "Failed to create message"}`);
        }

        const data = await res.json();
        console.log("Message created successfully:", data);
        dispatch({ type: CREATE_NEW_MESSAGE, payload: data });
    } catch (error) {
        console.error("Catch error in createMessage:", error);
    }
};

// Action for fetching all messages
export const getAllMessages = (reqData) => async (dispatch) => {
    try {
        const { chatId, token } = reqData;

        if (!chatId) {
            throw new Error("chatId is required");
        }
        if (!token) {
            throw new Error("Authorization token is required");
        }

        const res = await fetch(`${BASE_API_URL}/api/messages/chat/${chatId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error("Error fetching messages:", res.status, errorData);
            throw new Error(`Error: ${errorData.message || "Failed to fetch messages"}`);
        }

        const data = await res.json();
        console.log("Fetched all messages:", data); // Ensure this logs the correct array
        console.log("Dispatching action:", { type: GET_ALL_MESSAGE, payload: data });
dispatch({ type: GET_ALL_MESSAGE, payload: data });
; // Dispatching the action with payload
    } catch (error) {
        console.error("Catch error in getAllMessages:", error);
    }
};

