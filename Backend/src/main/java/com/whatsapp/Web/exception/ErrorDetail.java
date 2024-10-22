package com.whatsapp.Web.exception;

import java.time.LocalDateTime;

public class ErrorDetail {

    private String message;
    private String error;
    private LocalDateTime timeStamp;
    public ErrorDetail() {

    }

    public ErrorDetail(String message, String error, LocalDateTime timeStamp) {
        super();
        this.message = message;
        this.error = error;
        this.timeStamp = timeStamp;
    }
}
