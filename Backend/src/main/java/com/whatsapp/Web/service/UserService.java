package com.whatsapp.Web.service;

import com.whatsapp.Web.exception.UserException;
import com.whatsapp.Web.model.User;
import com.whatsapp.Web.request.UpdateUserRequest;
import jdk.jshell.spi.ExecutionControl;

import java.util.List;

public interface UserService {

    public User findUserById(Integer id) throws UserException;


    public User findUserByProfile(String jwt) throws UserException;

    public User updateUser(Integer userId, UpdateUserRequest req)throws UserException;

    public List<User> searchUser(String query);

}
