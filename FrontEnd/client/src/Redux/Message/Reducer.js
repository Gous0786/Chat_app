import { CREATE_NEW_MESSAGE, GET_ALL_MESSAGE } from "./ActionType";

const initialState = {
    messages: [], // Start with an empty array for messages
    newMessage: null,
};

export const messageReducer = (store = initialState, { type, payload }) => {
    console.log("Dispatching action:", type, payload); // Debugging log

    switch (type) {
        case CREATE_NEW_MESSAGE:
            return {
                ...store,
                messages: [...store.messages, payload], // Add new message to the list
                newMessage: payload, // Keep the latest new message
            };
        case GET_ALL_MESSAGE:
            // Log the payload to ensure it's the correct data structure
            console.log("Updating messages in state:", payload);
            return {
                ...store,
                messages: payload, // Replace with all messages from the API
            };
        default:
            return store; // Return the current state if no matching action
    }
};
