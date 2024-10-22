
import { LOGIN, REGISTER, REQ_USER, SEARCH_USER, UPDATE_USER } from "./ActionType";

// Initial state with all properties
const initialValue = {
  signin: null,
  signup: null,
  reqUser: null,  // Add reqUser property to avoid 'undefined' error
  searchUser: null,
  updateUser: null,
};

export const authReducer = (store = initialValue, { type, payload }) => {
  switch (type) {
    case REGISTER:
      return { ...store, signup: payload };
      
    case LOGIN:
      return { ...store, signin: payload };

    case REQ_USER:
      return { ...store, reqUser: payload };

    case SEARCH_USER:
      return { ...store, searchUser: payload };

    case UPDATE_USER:
      return { ...store, updateUser: payload };

    default:
      return store;
  }
};
