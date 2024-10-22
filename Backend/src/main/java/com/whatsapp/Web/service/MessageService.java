package com.whatsapp.Web.service;

import com.whatsapp.Web.exception.ChatException;
import com.whatsapp.Web.exception.MessageException;
import com.whatsapp.Web.exception.UserException;
import com.whatsapp.Web.model.Chat;
import com.whatsapp.Web.model.Message;
import com.whatsapp.Web.model.User;
import com.whatsapp.Web.request.SendMessageRequest;

import java.util.List;

public interface MessageService {

    public Message sendMessage(SendMessageRequest req)throws UserException, ChatException;

    public List<Message> getChatsMessage(Integer chatId, User reqUser) throws ChatException, UserException;

    public Message findMessageById(Integer messageId)throws MessageException;

    public void deleteMessage(Integer messageId,User reqUser)throws MessageException,UserException;
}


