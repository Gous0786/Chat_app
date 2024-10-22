package com.whatsapp.Web.request;

import jakarta.persistence.criteria.CriteriaBuilder;

public class SendMessageRequest {

    private Integer userId;
    private Integer chatId;
    private String content;

    public SendMessageRequest()
    {

    }
    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Integer getChatId() {
        return chatId;
    }

    public void setChatId(Integer chatId) {
        this.chatId = chatId;
    }
}
