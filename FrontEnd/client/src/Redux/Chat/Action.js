import { CREATE_CHAT, CREATE_GROUP, GET_USERS_CHAT } from './ActionType';
import { BASE_API_URL } from "../../config/api";

export const createChat = (chatData) => async (dispatch) => {
    try {
        const res = await fetch(`${BASE_API_URL}/api/chats/single`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${chatData.token}`
            },
            body: JSON.stringify(chatData.data)
        });

        // Check if response is ok
        if (!res.ok) {
            const error = await res.text();
            console.error("Error creating chat:", error);
            return; // Exit early to avoid dispatching undefined action
        }

        const data = await res.json();
        console.log("create chat", data);
        
        // Dispatch the action directly
        dispatch({ type: CREATE_CHAT, payload: data });
        
    } catch (error) {
        console.error("Caught error in createChat action:", error);
    }
};

export const createGroupChat = (chatData) => async (dispatch) => {
    try {
        const res = await fetch(`${BASE_API_URL}/api/chats/group`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${chatData.token}`
            },
            body: JSON.stringify(chatData.group)
        });

        // Check if response is ok
        if (!res.ok) {
            const error = await res.text();
            console.error("Error creating group chat:", error);
            return; // Exit early to avoid dispatching undefined action
        }

        const data = await res.json();
        console.log("create group chat", data);
        
        // Dispatch the action directly
        dispatch({ type: CREATE_GROUP, payload: data });

    } catch (error) {
        console.error("Caught error in createGroupChat action:", error);
    }
};

export const getUsersChat = (chatData) => async (dispatch) => {
    try {
        console.log("Fetching user chat data...");

        const res = await fetch(`${BASE_API_URL}/api/chats/user`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${chatData.token}`
            },
        });

        console.log("Response status:", res.status);

        if (!res.ok) {
            const error = await res.text();
            console.error("Failed to fetch user chat:", error);
            return; // Exit early to avoid dispatching undefined action
        }

        const data = await res.json();
        console.log("Users chat data:", data);

        // Check if group chats are present in the data
        const hasGroupChats = data.some(chat => chat.is_group); // Assuming is_group is a boolean
        console.log("Are there group chats?", hasGroupChats);
        
        // Dispatch the action directly
        dispatch({ type: GET_USERS_CHAT, payload: data });
        
    } catch (error) {
        console.error("Error fetching users chat:", error);
    }
};

