package com.whatsapp.Web.controller;

import com.whatsapp.Web.exception.UserException;
import com.whatsapp.Web.model.User;
import com.whatsapp.Web.request.UpdateUserRequest;
import com.whatsapp.Web.response.ApiResponse;
import com.whatsapp.Web.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile")
    public ResponseEntity<User> getUserProfileHandler(@RequestHeader("Authorization") String token) throws UserException {
        User user = userService.findUserByProfile(token);
        return new ResponseEntity<>(user, HttpStatus.ACCEPTED);
    }

    @GetMapping("/query")
    public ResponseEntity<List<User>> searchUserHandler(@RequestParam("query") String q) {
        List<User> users = userService.searchUser(q);
        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    @PutMapping("/update/{id}")  // Include ID as a path variable
    public ResponseEntity<ApiResponse> updateUserHandler(
            @PathVariable Long id,  // Capture the ID from the URL
            @RequestBody UpdateUserRequest req,
            @RequestHeader("Authorization") String token) throws UserException {
        System.out.println("Received update request for user ID: " + id + ", data: " + req);

        // You might want to validate the user token and ensure the user is authorized to update this profile.
        User user = userService.findUserByProfile(token);

        // Call the update method with the ID and request body
        userService.updateUser(Math.toIntExact(id), req);  // Update user using the ID passed in the URL

        ApiResponse res = new ApiResponse("User updated successfully", true);
        return new ResponseEntity<>(res, HttpStatus.ACCEPTED);
    }

}
