package com.whatsapp.Web.service;

import com.whatsapp.Web.exception.ChatException;
import com.whatsapp.Web.exception.MessageException;
import com.whatsapp.Web.exception.UserException;
import com.whatsapp.Web.model.Chat;
import com.whatsapp.Web.model.Message;
import com.whatsapp.Web.model.User;
import com.whatsapp.Web.repository.MessageRepository;
import com.whatsapp.Web.request.SendMessageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class MessageServiceImplementation implements MessageService {

    private MessageRepository messageRepository;
    private ChatService chatService;
    private UserService userService;

    public MessageServiceImplementation(MessageRepository messageRepository,ChatService chatService,UserService userService) {
        this.messageRepository = messageRepository;
        this.chatService = chatService;
        this.userService = userService;
    }
    @Override
    public Message sendMessage(SendMessageRequest req) throws UserException, ChatException {
        User user = userService.findUserById(req.getUserId());
        Chat chat = chatService.findChatById(req.getChatId());

        Message message = new Message();
        message.setChat(chat);
        message.setUser(user);
        message.setContent(req.getContent());
        message.setTimestamp(LocalDateTime.now());

        // Save the message to the repository
        return messageRepository.save(message); // Persist the message
    }


    @Override
    public List<Message> getChatsMessage(Integer chatId,User reqUser) throws ChatException, UserException {
        Chat chat=chatService.findChatById(chatId);

        if(!chat.getUsers().contains(reqUser)) {
           throw new UserException("You are not related to this chat "+chat.getId());
        }
        List<Message> messages = messageRepository.findByChatId(chat.getId());

        return messages;
    }

    @Override
    public Message findMessageById(Integer messageId) throws MessageException {

        Optional<Message> opt=messageRepository.findById(messageId);

        if(opt.isPresent()) {
            return opt.get();
        }
        throw new MessageException("Message not found with id "+messageId);
    }

    @Override
    public void deleteMessage(Integer messageId,User reqUser) throws MessageException ,UserException{
        Message message =findMessageById(messageId);

        if(message.getUser().getId().equals(reqUser.getId())) {
            messageRepository.deleteById(messageId);
        }
        throw new UserException("You can't delete another users' message "+reqUser.getFull_name());



    }
}
