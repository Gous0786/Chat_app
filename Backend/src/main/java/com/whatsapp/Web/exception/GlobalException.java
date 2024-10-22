package com.whatsapp.Web.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalException {

    @ExceptionHandler(UserException.class)
    public ResponseEntity<ErrorDetail> UserExceptionHandler(UserException e, WebRequest req)
    {
        ErrorDetail err=new ErrorDetail(e.getMessage(), req.getDescription(false), LocalDateTime.now() );
      return new ResponseEntity<ErrorDetail>(err, HttpStatus.BAD_REQUEST);
    }
    @ExceptionHandler(MessageException.class)
    public ResponseEntity<ErrorDetail> UserExceptionHandler(MessageException e, WebRequest req)

    {
        ErrorDetail err=new ErrorDetail(e.getMessage(), req.getDescription(false), LocalDateTime.now() );
        return new ResponseEntity<ErrorDetail>(err, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(ChatException.class)
    public ResponseEntity<ErrorDetail> ChatExceptionHandler(ChatException e, WebRequest req)

    {
        ErrorDetail err=new ErrorDetail(e.getMessage(), req.getDescription(false), LocalDateTime.now() );
        return new ResponseEntity<ErrorDetail>(err, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorDetail> MethodArgumentNotValidExceptionHandler(MethodArgumentNotValidException e, WebRequest req) {
        String error = e.getBindingResult().getFieldError().getDefaultMessage();  // Fixed typo from 'me' to 'e'

        ErrorDetail err = new ErrorDetail("Validation Error", error, LocalDateTime.now());
        return new ResponseEntity<>(err, HttpStatus.BAD_REQUEST);
    }













    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorDetail> otherExceptionHandler(Exception e, WebRequest req)
    {
        ErrorDetail err=new ErrorDetail(e.getMessage(), req.getDescription(false), LocalDateTime.now() );
        return new ResponseEntity<ErrorDetail>(err, HttpStatus.BAD_REQUEST);
    }


}
