import { BASE_API_URL } from "../../config/api";
import { LOGIN, LOGOUT, REGISTER, REQ_USER, SEARCH_USER, UPDATE_USER } from "./ActionType";

export const register=(data)=>async(dispatch)=>{
    try{
        const res = await fetch(`${BASE_API_URL}/auth/signup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"  // Ensure you are telling the server you expect JSON in the response
            },
            body: JSON.stringify(data)
        });
        
        const resData=await res.json();
        if (resData.jwt) {
            localStorage.setItem("jwt", resData.jwt);  // Store JWT in localStorage
        }
        
        console.log("register",resData)
        dispatch({type:REGISTER,payload:resData});
    }
    catch(error){

    }
}

// Login user
// Updated login function in Action.js
export const login = (data) => async (dispatch) => {
    try {
        const res = await fetch(`${BASE_API_URL}/auth/login`, {  // change /signin to /login
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data)
        });
        const resData = await res.json();
        console.log("login ", resData);
        if (resData.jwt) {
            localStorage.setItem("jwt", resData.jwt);  // Store JWT in localStorage
        }
        dispatch({ type: LOGIN, payload: resData });
    } catch (error) {
        console.log("Login error:", error);
    }
};


// Get current user profile
export const currentUser = (token) => async (dispatch) => {
    console.log("current user",token)
    try {
        const res = await fetch(`${BASE_API_URL}/api/users/profile`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });
        const resData = await res.json();
        console.log("current user ", resData);
        dispatch({ type: REQ_USER, payload: resData });
    } catch (error) {
        console.log("Fetching current user error:", error);
    }
};

// Search for users
export const searchUser = (data) => async (dispatch) => {
    try {
        const res = await fetch(`${BASE_API_URL}/api/users/query?query=${data.keyword}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`
            }
        });
        const resData = await res.json();
        console.log("search user ", resData);
        dispatch({ type: SEARCH_USER, payload: resData });
    } catch (error) {
        console.log("Search user error:", error);
    }
};

// Update user profile
export const updateUser = (data) => async (dispatch) => {
    try {
        // Send a PUT request to update the user profile
        const res = await fetch(`${BASE_API_URL}/api/users/update/${data.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json", // Ensure the correct Content-Type
                "Accept": "application/json", // Specify acceptable response format
                "Authorization": `Bearer ${data.token}` // Include the Authorization token
            },
            body: JSON.stringify(data.data) // Convert the data to JSON
        });

        // Check if the response is ok (status in the range 200-299)
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const resData = await res.json(); // Parse the response JSON
        console.log("Update user response: ", resData);

        // Dispatch the action to update user in the state
        dispatch({ type: UPDATE_USER, payload: resData });
    } catch (error) {
        console.error("Update user error:", error); // Log the error for debugging
    }
};


export const logoutAction=()=>async(dispatch)=>{
    localStorage.removeItem("jwt");
    dispatch({type:LOGOUT,payload:null});
    dispatch({type:REQ_USER,payload:null})
}
