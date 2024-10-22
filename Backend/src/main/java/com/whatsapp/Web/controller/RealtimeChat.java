package com.whatsapp.Web.controller;

import com.whatsapp.Web.model.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class RealtimeChat {
    @Autowired
    private SimpMessagingTemplate simpMessagingTemplate;


    @MessageMapping("/message")
    @SendTo("/group/public")
    public Message receiveMessage(@Payload Message message) {
        // Send the message to the specific chat group
        if (simpMessagingTemplate == null) {
                    throw new IllegalStateException("SimpMessagingTemplate is not initialized");
               }
        simpMessagingTemplate.convertAndSend("/group/" + message.getChat().getId(), message);

        System.out.println("websocket kaam kr rha h");
        // Return the message or a success response
        return message;  // You can modify this if you want to return a different response
    }
}
