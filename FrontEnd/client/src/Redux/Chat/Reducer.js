import { CREATE_CHAT, CREATE_GROUP, GET_USERS_CHAT } from "./ActionType";

const initialValue = {
    chats: [],
    createdGroup: null,
    createdChat: null,
};

export const chatReducer = (store = initialValue, { type, payload }) => {
    switch (type) {
        case CREATE_CHAT:
            return { ...store, createdChat: payload };

        case CREATE_GROUP:
            return { ...store, createdGroup: payload }; // Update createdGroup instead of createdChat

        case GET_USERS_CHAT:
            return { ...store, chats: payload };

        default:
            return store;
    }
};
