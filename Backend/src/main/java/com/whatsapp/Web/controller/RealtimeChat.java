package com.whatsapp.Web.controller;

import com.whatsapp.Web.model.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class RealtimeChat {
    @Autowired
    private SimpMessagingTemplate simpMessagingTemplate;

    // Deliver only to the specific chat's topic. No global broadcast:
    // a @SendTo("/group/public") here would leak every message to any subscriber.
    @MessageMapping("/message")
    public void receiveMessage(@Payload Message message) {
        simpMessagingTemplate.convertAndSend("/group/" + message.getChat().getId(), message);
    }
}
