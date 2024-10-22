package com.whatsapp.Web.controller;

import com.whatsapp.Web.exception.ChatException;
import com.whatsapp.Web.exception.MessageException;
import com.whatsapp.Web.exception.UserException;
import com.whatsapp.Web.model.Message;
import com.whatsapp.Web.model.User;
import com.whatsapp.Web.request.SendMessageRequest;
import com.whatsapp.Web.response.ApiResponse;
import com.whatsapp.Web.service.MessageService;
import com.whatsapp.Web.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private MessageService messageService;
    private UserService userService;

    public MessageController(MessageService messageService, UserService userService) {
        this.messageService = messageService;
        this.userService = userService;
    }

    @PostMapping("/create")
    public ResponseEntity<Message> sendMessageHandler(@RequestBody SendMessageRequest req, @RequestHeader("Authorization") String jwt) throws UserException, ChatException {

        User user=userService.findUserByProfile(jwt);

        req.setUserId(user.getId());


        Message message = messageService.sendMessage(req);
       System.out.println("Hit ho gya bkl");
        return new ResponseEntity<Message>(message, HttpStatus.OK);

    }

    @GetMapping("/chat/{chatId}")
    public ResponseEntity<List<Message>> getChatsMessageHandler(
            @PathVariable Integer chatId,
            @RequestHeader("Authorization") String jwt) throws UserException, ChatException {

        // Use the JWT token to find the user
        User user = userService.findUserByProfile(jwt);

        // Fetch messages for the given chatId and user
        List<Message> messages = messageService.getChatsMessage(chatId, user);

        return new ResponseEntity<>(messages, HttpStatus.OK);
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<ApiResponse> deleteMessageHandler(@PathVariable Integer messageId,@RequestBody SendMessageRequest req, @RequestHeader("Authorization") String jwt) throws UserException, MessageException {

        User user=userService.findUserByProfile(jwt);




        messageService.deleteMessage(messageId,user);

        ApiResponse res=new ApiResponse("message deleted sucecssfully",false);

        return new ResponseEntity<>(res, HttpStatus.OK);

    }





}
