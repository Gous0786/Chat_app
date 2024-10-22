package com.whatsapp.Web.request;

public class SingleChatRequest {
    private Integer userId;
    private int chatId;
    private String content;

    public SingleChatRequest(int chatId, Integer userId, String content) {
        this.chatId = chatId;
        this.userId = userId;
        this.content = content;
    }

    public SingleChatRequest() {

    }
    public SingleChatRequest(Integer userId) {
        super();
        this.userId = userId;
    }

    public int getChatId() {
        return chatId;
    }

    public void setChatId(int chatId) {
        this.chatId = chatId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }
}
